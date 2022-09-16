import { SigningAuthority } from '@ucanto/authority'
import { Delegation, UCAN } from '@ucanto/core'
import * as API from '@ucanto/interface'
import { Failure } from '@ucanto/validator'
// @ts-ignore
import * as capabilities from '@web3-storage/access/capabilities'
import fetch from 'cross-fetch'

import * as CAR from '../patches/@ucanto/transport/car.js'
import * as defaults from './defaults.js'
import { Access, Store } from './store/index.js'
import { sleep } from './utils.js'

/**
 * A string representing a link to another object in IPLD
 * @typedef {API.Link} Link
 */
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
   * @returns {Promise<API.SigningAuthority>}
   */
  async identity() {
    const secret = this.settings.get('secret') || null
    try {
      return SigningAuthority.decode(secret)
    } catch (error) {
      const id = await SigningAuthority.generate()
      this.settings.set('secret', SigningAuthority.encode(id))
      return id
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
    const result = await capabilities.identityValidate
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
    const id = await this.identity()
    return capabilities.storeList
      .invoke({
        issuer: id,
        audience: this.storeClient.id,
        with: id.did(),
      })
      .execute(this.storeClient)
  }

  /**
   * Upload a car via bytes.
   * @async
   * @param {Uint8Array} bytes - the url to upload
   * @returns {Promise<strResult>}
   */
  async upload(bytes) {
    try {
      const id = await this.identity()
      const link = await CAR.codec.link(bytes)
      const result = await capabilities.storeAdd
        .invoke({
          issuer: id,
          audience: this.storeClient.id,
          with: id.did(),
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
    const id = await this.identity()
    return await capabilities.storeRemove
      .invoke({
        issuer: id,
        audience: this.storeClient.id,
        with: id.did(),
        caveats: {
          link,
        },
      })
      .execute(this.storeClient)
  }

  /**
   * Remove an uploaded file by CID
   * @param {Link} root - the CID to link as root.
   * @param {Array<Link>} links - the CIDs to link as 'children'
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
   * @param {Link} link - the CID to get insights for
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
   * @param {Link} link - the CID to get insights for
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
