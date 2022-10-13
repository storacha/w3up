import { Delegation, UCAN } from '@ucanto/core'
import * as API from '@ucanto/interface'
import { SigningPrincipal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
// @ts-ignore
import fetch from 'cross-fetch'

import * as defaults from './defaults.js'
import {
  generateDelegation,
  importDelegation,
  writeDelegation,
} from './delegation.js'
import { toPrincipal } from './settings.js'
import { Access, Store } from './store/index.js'
import { sleep } from './utils.js'

export * from './settings.js'

/** @typedef {API.Result<unknown, ({error:true}|API.HandlerExecutionError|API.Failure)>} Result */
/** @typedef {API.Result<string, ({error:true}|API.HandlerExecutionError|API.Failure)>} strResult */

/**
 * @typedef {object} ClientOptions
 * @property {API.DID} serviceDID - The DID of the service to talk to.
 * @property {string} serviceURL - The URL of the service to talk to.
 * @property {string} accessURL - The URL of the access service.
 * @property {API.DID} accessDID - The DID of the access service.
 * @property {Map<string, any>} settings - A map/db of settings to use for the client.
 */

/**
 * @param {ClientOptions} options
 * @returns Client
 */
export function createClient(options) {
  return new Client(options)
}

const DefaultClientOptions = {
  /** @type {API.DID} */
  accessDID: defaults.ACCESS_DID,
  accessURL: defaults.ACCESS_URL,
  /** @type {API.DID} */
  serviceDID: defaults.W3_STORE_DID,
  serviceURL: defaults.SERVICE_URL,
  settings: new Map(),
}

class Client {
  /**
   * Create an instance of the w3 client.
   * @param {ClientOptions} options
   */
  constructor({
    serviceDID,
    serviceURL,
    accessURL,
    accessDID,
    settings,
  } = DefaultClientOptions) {
    this.serviceURL = new URL(serviceURL)
    this.serviceDID = serviceDID

    this.accessURL = new URL(accessURL)
    this.accessDID = accessDID
    this.settings = settings

    this.storeClient = Store.createConnection({
      id: this.serviceDID,
      url: this.serviceURL,
      fetch,
    })

    this.accessClient = Access.createConnection({
      id: this.accessDID,
      url: this.accessURL,
      fetch,
    })
  }

  /**
   * Get the current "machine" DID
   * @async
   * @returns {Promise<API.SigningPrincipal>}
   */
  async agent() {
    let secret = this.settings.get('agent_secret') || null

    let id = toPrincipal(secret)
    if (!id) {
      id = await SigningPrincipal.generate()
    }

    if (!this.settings.has('agent_secret')) {
      this.settings.set('agent_secret', SigningPrincipal.format(id))
    }

    return id
  }

  /**
   * Get the current "account" DID
   * @async
   * @returns {Promise<API.SigningPrincipal>}
   */
  async account() {
    let secret = this.settings.get('account_secret') || null

    // For now, move old secret value to new account_secret.
    if (!secret && this.settings.has('secret')) {
      secret = this.settings.get('secret')
      //       this.settings.delete('secret')
    }
    let id = toPrincipal(secret)
    if (!id) {
      id = await SigningPrincipal.generate()
    }

    if (!this.settings.has('account_secret')) {
      this.settings.set('account_secret', SigningPrincipal.format(id))
    }

    return id
  }

  /**
   * @async
   * @returns {Promise<API.Delegation|null>}
   */
  async currentDelegation() {
    let did = this.settings.has('delegation')
      ? this.settings.get('delegation')
      : null

    let delegations = this.settings.has('delegations')
      ? this.settings.get('delegations')
      : {}

    //Generate first delegation from account to agent.
    if (!did) {
      const issuer = await this.account()
      const to = (await this.agent()).did()
      const del = await generateDelegation({ to, issuer }, true)

      did = (await this.account()).did()

      delegations[did] = { ucan: del, alias: 'self' }
      this.settings.set('delegations', delegations)
      this.settings.set('delegation', issuer.did())
    }

    delegations = this.settings.has('delegations')
      ? this.settings.get('delegations')
      : {}

    try {
      const ucan = delegations[did]?.ucan
      const del = Delegation.import([ucan?.root])
      return del
    } catch (err) {
      console.log('err', err)
      return null
    }
  }

  /** @typedef {object} IdentityInfo
   * @property {API.SigningPrincipal} agent - The local agent principal
   * @property {API.SigningPrincipal} account - The local account principal
   * @property {API.DID} with - The current acccount (delegated) DID
   * @property {Array<API.Delegation>} proofs - The current delegation as a proof set.
   */
  /**
   * @async
   * @returns {Promise<IdentityInfo>}
   */
  async identity() {
    const agent = await this.agent()
    const account = await this.account()
    const delegation = await this.currentDelegation()

    return {
      agent,
      account,
      //@ts-ignore
      with: delegation?.capabilities[0].with || account.did(),
      proofs: delegation ? [delegation] : [],
    }
  }

  /**
   * Register a user by email.
   * @param {string|undefined} email - The email address to register with.
   */
  async register(email) {
    const savedEmail = this.settings.get('email')
    if (!savedEmail) {
      this.settings.set('email', email)
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
      const result = await Access.validate
        .invoke({
          issuer: identity.account,
          with: identity.account.did(),
          audience: this.accessClient.id,
          caveats: {
            as: `mailto:${email}`,
          },
          proofs: identity.proofs,
        })
        .execute(this.accessClient)
      if (result?.error) {
        console.log('hi', result)
      }
    } catch (err) {
      if (err) {
        console.log('error', err)
      }
    }

    const proofString = await this.checkRegistration()
    const ucan = UCAN.parse(proofString)
    const root = await UCAN.write(ucan)
    const proof = Delegation.create({ root })

    // TODO: this should be better.
    // Use access API/client to do all of this.
    const first = proof.capabilities[0]
    try {
      const validate = await Access.register
        .invoke({
          issuer: identity.account,
          audience: this.accessClient.id,
          // @ts-ignore
          with: first.with,
          caveats: {
            // @ts-ignore
            as: first.as,
          },
          proofs: [proof],
        })
        .execute(this.accessClient)

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
   * @async
   * @throws {Error}
   * @returns {Promise<UCAN.JWT>}
   */
  async checkRegistration() {
    const { account } = await this.identity()
    let count = 0

    /**
     * @async
     * @throws {Error}
     * @returns {Promise<UCAN.JWT>}
     */
    const check = async () => {
      if (count > 100) {
        throw new Error('Could not validate.')
      } else {
        count++
        const result = await fetch(
          `${this.accessURL}validate?did=${account.did()}`,
          {
            mode: 'cors',
          }
        )

        if (!result.ok) {
          await sleep(1000)
          return await check()
        } else {
          // @ts-ignore
          return await result.text()
        }
      }
    }

    return await check()
  }

  /**
   * @async
   * @returns {Promise<Result>}
   */
  async whoami() {
    const identity = await this.identity()
    return await Access.identify
      .invoke({
        issuer: identity.agent,
        with: identity.with,
        proofs: identity.proofs,
        audience: this.accessClient.id,
      })
      .execute(this.accessClient)
  }

  /**
   * List all of the uploads connected to this user.
   * @async
   * @returns {Promise<Result>}
   */
  async list() {
    const identity = await this.identity()
    return Store.list
      .invoke({
        issuer: identity.agent,
        with: identity.with,
        proofs: identity.proofs,
        audience: this.storeClient.id,
      })
      .execute(this.storeClient)
  }

  /**
   * @typedef {object} DelegationOptions
   * @property {API.DID} to
   * @property {number} [expiration]
   */

  /**
   * @param {DelegationOptions} opts
   * @returns {Promise<Uint8Array>}
   */
  async makeDelegation(opts) {
    return writeDelegation({
      issuer: await this.account(),
      to: opts.to,
      expiration: opts.expiration,
    })
  }

  /**
   * @param {Uint8Array} bytes
   * @param {string} alias
   * @returns {Promise<API.Delegation>}
   */
  async importDelegation(bytes, alias = '') {
    const imported = await importDelegation(bytes)
    const did = imported.issuer.did()

    const audience = imported.audience.did()
    const id = (await this.agent()).did()
    if (id != audience) {
      throw new Error(
        `Cannot import delegation, it was issued to ${audience} and your did is ${id}`
      )
    }

    let delegations = this.settings.has('delegations')
      ? this.settings.get('delegations')
      : {}

    delegations[did] = { ucan: imported, alias }
    this.settings.set('delegations', delegations)

    return imported
  }

  /**
   * Upload a car via bytes.
   * @async
   * @param {Uint8Array} bytes - the url to upload
   * @param {string|undefined} [origin] - the CID of the previous car chunk.
   * @returns {Promise<strResult>}
   */
  async upload(bytes, origin) {
    try {
      const identity = await this.identity()
      const link = await CAR.codec.link(bytes)
      const result = await Store.add
        .invoke({
          issuer: identity.agent,
          with: identity.with,
          audience: this.storeClient.id,
          caveats: {
            link,
            origin,
          },
          proofs: identity.proofs,
        })
        .execute(this.storeClient)

      if (result?.error !== undefined) {
        throw new Error(JSON.stringify(result, null, 2))
      }

      const castResult =
        /** @type {{status:string, with:API.DID, url:String, headers:HeadersInit}} */
        (result)

      // Return early if it was already uploaded.
      if (castResult.status === 'done') {
        return `Car ${link} is added to ${castResult.with}`
      }

      // Get the returned signed URL, and upload to it.
      const response = await fetch(castResult.url, {
        method: 'PUT',
        mode: 'cors',
        body: bytes,
        headers: castResult.headers,
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
   * Remove an uploaded file by CID
   * @param {API.Link} link - the CID to remove
   */
  async remove(link) {
    const identity = await this.identity()
    return await Store.remove
      .invoke({
        issuer: identity.agent,
        with: identity.with,
        audience: this.storeClient.id,
        proofs: identity.proofs,
        caveats: {
          link,
        },
      })
      .execute(this.storeClient)
  }

  /**
   * @async
   * @param {API.Link} link - the CID to get insights for
   * @returns {Promise<object>}
   */
  async insights(link) {
    await fetch(defaults.insightsAPI + '/insights', {
      method: 'POST',
      body: JSON.stringify({ cid: link }),
    }).then((res) => res.json())

    await sleep(1000)

    const insights = await fetch(defaults.insightsAPI + '/insights', {
      method: 'POST',
      body: JSON.stringify({ cid: link }),
    }).then((res) => res.json())

    return insights
  }
}

export default Client

/**
 * Remove an uploaded file by CID
 * @param {API.Link} root - the CID to link as root.
 * @param {Array<API.Link>} links - the CIDs to link as 'children'
 */
//   async linkroot(root, links) {
//     const id = await this.identity()
//     return await Store.LinkRoot.invoke({
//       issuer: id,
//       audience: this.storeClient.id,
//       with: id.did(),
//       caveats: {
//         rootLink: root,
//         links,
//       },
//     }).execute(this.storeClient)
//   }

/**
 * @async
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
