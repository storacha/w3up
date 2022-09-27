import { Delegation, UCAN } from '@ucanto/core'
import * as API from '@ucanto/interface'
import { SigningPrincipal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
import { Failure } from '@ucanto/validator'
// @ts-ignore
import * as capabilities from '@web3-storage/access/capabilities'
import fetch from 'cross-fetch'

import * as defaults from './defaults.js'
import * as delegation from './delegation.js'
import { Access, Store } from './store/index.js'
import { sleep } from './utils.js'

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
 * @async
 * @param {UCAN.JWT} input
 * @returns {Promise<API.Delegation|Failure>}
 */
export const importToken = async (input) => {
  try {
    const ucan = UCAN.parse(input)
    const root = await UCAN.write(ucan)
    return Delegation.create({ root })
  } catch (error) {
    return new Failure(String(error))
  }
}

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

    this.storeClient = Store.connect({
      id: this.serviceDID,
      url: this.serviceURL,
      fetch,
    })

    this.accessClient = Access.connect({
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
  async identity() {
    const secret = this.settings.get('secret') || null
    try {
      return SigningPrincipal.decode(secret)
    } catch (error) {
      const id = await SigningPrincipal.generate()
      this.settings.set('secret', SigningPrincipal.encode(id))
      return id
    }
  }

  async delegation() {
    const did = this.settings.has('delegation')
      ? this.settings.get('delegation')
      : null

    const delegations = this.settings.has('delegations')
      ? Object.values(this.settings.get('delegations')).map((x) =>
          Delegation.import([x.ucan.root])
        )
      : []

    const delegation = delegations.find((x) => x.issuer.did() == did)
    return delegation
  }

  /**
   * @async
   * @returns {Promise<{
   * issuer: API.SigningPrincipal,
   * with: API.DID,
   * proofs: Array<any>
   * }>} [TODO:description]
   */
  async setup() {
    const id = await this.identity()
    const delegation = await this.delegation()

    return {
      issuer: id,
      // @ts-ignore
      with: delegation?.capabilities[0].with || id.did(),
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
    const issuer = await this.identity()
    await capabilities.identityValidate
      .invoke({
        issuer,
        audience: this.accessClient.id,
        with: issuer.did(),
        caveats: {
          as: `mailto:${email}`,
        },
      })
      .execute(this.accessClient)

    const proofString = await this.checkRegistration()
    const ucan = UCAN.parse(proofString)
    const root = await UCAN.write(ucan)
    const proof = Delegation.create({ root })

    // TODO: this should be better.
    // Use access API/client to do all of this.
    const first = proof.capabilities[0]
    const validate = await capabilities.identityRegister
      .invoke({
        issuer,
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

    return `Email registered ${email}`
  }

  /**
   * @async
   * @throws {Error}
   * @returns {Promise<UCAN.JWT>}
   */
  async checkRegistration() {
    const issuer = await this.identity()
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
          `${this.accessURL}validate?did=${issuer.did()}`,
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
    const issuer = await this.identity()
    return await capabilities.identityIdentify
      .invoke({
        issuer,
        audience: this.accessClient.id,
        with: issuer.did(),
      })
      .execute(this.accessClient)
  }

  /**
   * List all of the uploads connected to this user.
   * @async
   * @returns {Promise<Result>}
   */
  async list() {
    const opts = await this.setup()
    return capabilities.storeList
      .invoke({
        ...opts,
        audience: this.storeClient.id,
      })
      .execute(this.storeClient)
  }

  /**
   * @param {any} did
   * @returns {Promise<Uint8Array>}
   */
  async makeDelegation(did) {
    const id = await this.identity()

    return delegation.createDelegation({
      issuer: await this.identity(),
      did,
    })
  }

  /**
   * @param {Uint8Array} bytes
   * @returns {Promise<any>}
   */
  async importDelegation(bytes) {
    const id = await this.identity()
    // TODO: save into settings.

    return delegation.importDelegation(bytes)
  }

  /**
   * Upload a car via bytes.
   * @async
   * @param {Uint8Array} bytes - the url to upload
   * @returns {Promise<strResult>}
   */
  async upload(bytes) {
    try {
      const opts = await this.setup()
      const link = await CAR.codec.link(bytes)
      const result = await capabilities.storeAdd
        .invoke({
          ...opts,
          audience: this.storeClient.id,
          caveats: {
            link,
          },
        })
        .execute(this.storeClient)

      if (result?.error !== undefined) {
        throw new Error(JSON.stringify(result))
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
    const opts = await this.setup()
    return await capabilities.storeRemove
      .invoke({
        ...opts,
        audience: this.storeClient.id,
        caveats: {
          link,
        },
      })
      .execute(this.storeClient)
  }

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
}

export default Client
