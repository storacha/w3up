import * as defaults from './defaults.js'
import {
  delegationToString,
  stringToDelegation
} from './delegation/encoding.js'
import { generateDelegation } from './delegation/generation.js'
import { Access, Store } from './store/index.js'
import { checkUrl, sleep } from './utils.js'
import { Delegation, UCAN } from '@ucanto/core'
// eslint-disable-next-line no-unused-vars
import * as API from '@ucanto/interface'
import { SigningPrincipal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
// @ts-ignore
import * as Upload from '@web3-storage/access/capabilities/upload'
import fetch from 'cross-fetch'

export { stringToDelegation } from './delegation/encoding.js'

/** @typedef {API.Result<unknown, ({error:true}|API.HandlerExecutionError|API.Failure)>} Result */
/** @typedef {API.Result<string, ({error:true}|API.HandlerExecutionError|API.Failure)>} strResult */

/**
 * @typedef {object} ClientOptions
 * @property {API.DID} [ serviceDID ] - The DID of the w3up service.
 * @property {string} [ serviceURL ] - The URL of the w3up service.
 * @property {string} [ accessURL ] - The URL of the access service.
 * @property {API.DID} [ accessDID ] - The DID of the access service.
 * @property {import('./types.js').SettingsRaw} settings - Settings to use for the client.
 */

/**
 * @param {ClientOptions} options
 * @returns {Client}
 */
export function createClient (options) {
  return new Client(options)
}

class Client {
  /**
   * Create an instance of the w3 client.
   * @param {ClientOptions} options
   */
  constructor ({ serviceDID, serviceURL, accessURL, accessDID, settings }) {
    this.serviceURL = new URL(serviceURL || defaults.SERVICE_URL)
    this.serviceDID = serviceDID || defaults.W3_STORE_DID
    this.accessURL = new URL(accessURL || defaults.ACCESS_URL)
    this.accessDID = accessDID || defaults.ACCESS_DID

    this.settings = settings

    this.w3upConnection = Store.createConnection({
      id: this.serviceDID,
      url: this.serviceURL,
      fetch
    })

    this.accessConnection = Access.createConnection({
      id: this.accessDID,
      url: this.accessURL,
      fetch
    })
  }

  static async create () {}

  /**
   * Get the current "machine" DID
   * @returns {Promise<API.SigningPrincipal>}
   */
  async agent () {
    const secret = this.settings.agent_secret

    if (secret) {
      return SigningPrincipal.parse(secret)
    }

    const principal = await SigningPrincipal.generate()
    this.settings.agent_secret = SigningPrincipal.format(principal)

    return principal
  }

  /**
   * Get the current "account" DID
   * @returns {Promise<API.SigningPrincipal>}
   */
  async account () {
    const secret = this.settings.account_secret

    if (secret) {
      return SigningPrincipal.parse(secret)
    }

    const account = await SigningPrincipal.generate()
    const agent = await this.agent()
    const del = await generateDelegation(
      { to: agent.did(), issuer: account },
      true
    )
    if (!this.settings.delegations) {
      this.settings.delegations = {}
    }
    this.settings.account_secret = SigningPrincipal.format(account)
    this.settings.account = account.did()
    this.settings.delegations[account.did()] = {
      alias: 'self',
      ucan: await delegationToString(del)
    }
    return account
  }

  async currentDelegation () {
    const account = this.settings.account
    if (!account) {
      throw new Error('No current account')
    }
    const del = this.settings.delegations[account]

    return stringToDelegation(del.ucan)
  }

  /**
   * @typedef {object} IdentityInfo
   * @property {API.SigningPrincipal} agent - The local agent principal
   * @property {API.SigningPrincipal} account - The local account principal
   * @property {API.DID} with - The current acccount (delegated) DID
   * @property {Array<API.Delegation>} proofs - The current delegation as a proof set.
   */

  /**
   * @returns {Promise<IdentityInfo>}
   */
  async identity () {
    const agent = await this.agent()
    const account = await this.account()
    const delegation = await this.currentDelegation()

    if (!this.settings.account) {
      throw new Error('No account selected.')
    }

    return {
      agent,
      account,
      with: this.settings.account,
      proofs: [delegation]
    }
  }

  /**
   * Register a user by email.
   * @param {string|undefined} email - The email address to register with.
   */
  async register (email) {
    const savedEmail = this.settings.email
    if (!savedEmail) {
      this.settings.email = email
    } else if (email !== savedEmail) {
      throw new Error(
        'Trying to register a second email, this is not supported yet.'
      )
    }
    if (!email) {
      throw new Error(`Invalid email provided for registration: ${email}`)
    }
    const identity = await this.identity()

    try {
      // @ts-ignore
      const result = await Access.validate
        .invoke({
          issuer: identity.account,
          with: identity.account.did(),
          audience: this.accessConnection.id,
          caveats: {
            as: `mailto:${email}`
          },
          proofs: identity.proofs
        })
        .execute(this.accessConnection)
      if (result?.error) {
        throw new Error(result?.cause?.message)
      }
    } catch (err) {
      if (err) {
        console.log('error', err)
      }
    }

    const url = `${this.accessURL}validate?did=${identity.account.did()}`
    const proofString = await checkUrl(url)
    const ucan = UCAN.parse(proofString)
    const root = await UCAN.write(ucan)
    const proof = Delegation.create({ root })

    // TODO: this should be better.
    // Use access API/client to do all of this.
    const first = proof.capabilities[0]
    try {
      // @ts-ignore
      const validate = await Access.register
        .invoke({
          issuer: identity.account,
          audience: this.accessConnection.id,
          with: first.with,
          caveats: {
            // @ts-ignore
            as: first.as
          },
          proofs: [proof]
        })
        .execute(this.accessConnection)

      if (validate?.error) {
        // @ts-ignore
        throw new Error(validate?.cause?.message)
      }
    } catch (err) {
      console.log('error', err)
    }

    return `Email registered ${email}`
  }

  /**
   * @returns {Promise<Result>}
   */
  async whoami () {
    // @ts-ignore
    return await this.invoke(Access.identify, this.accessConnection)
  }

  /**
   * List all of the cars connected to this user.
   * @returns {Promise<Result>}
   */
  async stat () {
    // @ts-ignore
    return this.invoke(Store.list, this.w3upConnection, {})
  }

  /**
   * List all of the uploads connected to this user.
   * @returns {Promise<Result>}
   */
  async list () {
    return this.invoke(Upload.list, this.w3upConnection, {})
  }

  /**
   * @typedef {object} DelegationOptions
   * @property {API.DID} to
   * @property {number} [expiration]
   */

  /**
   * @param {DelegationOptions} opts
   */
  async makeDelegation (opts) {
    return generateDelegation(
      {
        issuer: await this.account(),
        to: opts.to,
        expiration: opts.expiration
      },
      true
    )
  }

  /**
   * @param {DelegationOptions} opts
   * @returns {Promise<string>} delegation
   */
  async exportDelegation (opts) {
    return await delegationToString(await this.makeDelegation(opts))
  }

  /**
   * @param {string} delegationString
   * @param {string} alias
   * @returns {Promise<API.Delegation>}
   */
  async importDelegation (delegationString, alias = '') {
    const imported = await stringToDelegation(delegationString)
    const did = imported.issuer.did()

    const audience = imported.audience.did()
    const id = (await this.agent()).did()
    if (id !== audience) {
      throw new Error(
        `Cannot import delegation, it was issued to ${audience} and your did is ${id}`
      )
    }

    this.settings.delegations[did] = { ucan: delegationString, alias }

    return imported
  }

  /**
   * Upload a car via bytes.
   * @param {Uint8Array} bytes - the url to upload
   * @param {string|undefined} [origin] - the CID of the previous car chunk.
   * @returns {Promise<strResult>}
   */
  async upload (bytes, origin) {
    try {
      const link = await CAR.codec.link(bytes)
      const params = {
        link,
        size: bytes.byteLength
      }
      if (origin) {
        // @ts-ignore
        params.origin = origin
      }
      /** @type {{status:string, with:API.DID, url:String, headers:HeadersInit, error:boolean}} */
      // @ts-ignore
      const result = await this.invoke(Store.add, this.w3upConnection, params)

      if (result.error) {
        throw new Error(JSON.stringify(result, null, 2))
      }

      // Return early if it was already uploaded.
      if (result.status === 'done') {
        return `Car ${link} is added to ${result.with}`
      }

      // Get the returned signed URL, and upload to it.
      const response = await fetch(result.url, {
        method: 'PUT',
        mode: 'cors',
        body: bytes,
        headers: result.headers
      })

      if (!response.ok) {
        throw new Error(
          `Failed uploading ${link} with ${response.status}: ${response.statusText}`
        )
      }
      return `Succeeded uploading ${link} with ${response.status}: ${response.statusText}`
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  /**
   * Add an upload to the list of uploads
   * @param {API.Link} dataCID
   * @param {Array<API.Link>} shardCIDs
   */
  async uploadAdd (dataCID, shardCIDs) {
    const result = await this.invoke(Upload.add, this.w3upConnection, {
      root: dataCID,
      shards: shardCIDs
    })
    if (result?.error !== undefined) {
      throw new Error(JSON.stringify(result, null, 2))
    }

    return `Succeeded adding ${dataCID}`
  }

  /**
   * Remove an uploaded file by CID
   * @param {API.Link} link - the CID to remove
   */
  async remove (link) {
    // @ts-ignore
    const result = await this.invoke(Store.remove, this.w3upConnection, {
      root: link
    })

    if (result?.error !== undefined) {
      throw new Error(JSON.stringify(result, null, 2))
    }
    return `Succeeded removing ${result}`
  }

  /**
   * Remove an uploaded file by CID
   * @param {API.Link} link - the CID to remove
   */
  async removeUpload (link) {
    const result = await this.invoke(Upload.remove, this.w3upConnection, {
      root: link
    })
    if (result?.error !== undefined) {
      throw new Error(JSON.stringify(result, null, 2))
    }
    return `Succeeded removing ${result}`
  }

  /**
   * @param {any} capability
   * @param {any} connection
   * @param {any} caveats
   * @returns {Promise<any>}
   */
  async invoke (capability, connection, caveats) {
    const identity = await this.identity()
    return await capability
      .invoke({
        issuer: identity.agent,
        with: identity.with,
        audience: connection.id,
        proofs: identity.proofs,
        caveats
      })
      .execute(connection)
  }

  /**
   * @param {API.Link} link - the CID to get insights for
   * @returns {Promise<object>}
   */
  async insights (link) {
    await fetch(defaults.insightsAPI + '/insights', {
      method: 'POST',
      body: JSON.stringify({ cid: link })
    }).then((res) => res.json())

    await sleep(1000)

    const insights = await fetch(defaults.insightsAPI + '/insights', {
      method: 'POST',
      body: JSON.stringify({ cid: link })
    }).then((res) => res.json())

    return insights
  }
}

export default Client

/**
 * @param {API.Link} link - the CID to get insights for
 * @returns {Promise<object>}
 */
//   async insightsWS(link) {
//     return new Promise((resolve, reject) => {
//       const ws = new WebSocket(wssInightsUrl, {});
//
//       ws.on('message', () => {
//         console.log('message');
//       });
//       ws.on('open', () => {
//         console.log('opened');
//         ws.send(
//           JSON.stringify({
//             action: 'cidsubscribe',
//             data: {
//               cids: 'abc,t',
//             },
//           })
//         );
//       });
//       ws.on('error', (err) => {
//         //         console.log('error', err.message)
//         reject(err);
//       });
//     });
//   }
