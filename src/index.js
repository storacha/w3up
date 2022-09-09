import * as API from '@ucanto/interface';
import * as CAR from './patches/@ucanto/transport/car.js';
import { SigningAuthority, Authority } from '@ucanto/authority';
import { Delegation, UCAN } from '@ucanto/core';
import { Failure } from '@ucanto/validator';
import fetch from 'cross-fetch';
import { Store, Identity, Access } from './store/index.js';
import { insightsAPI } from './defaults.js';

/**
 * A string representing a link to another object in IPLD
 * @typedef {string} Link
 */
/** @typedef {API.Result<unknown|string, {error:true}|API.HandlerExecutionError|API.Failure>} Result */

/**
 * @typedef {object} ClientOptions
 * @property {API.DID} serviceDID - The DID of the service to talk to.
 * @property {string} serviceURL - The URL of the service to talk to.
 * @property {string} accessURL - The URL of the access service.
 * @property {API.DID} accessDID - The DID of the access service.
 * @property {Map<string, any>} settings - A map/db of settings to use for the client.
 */

/**
 * Create a promise that resolves in ms.
 * @async
 * @param {number} ms - The number of milliseconds to sleep for.
 * @returns {Promise<void>}
 */
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @async
 * @param {UCAN.JWT} input
 * @returns {Promise<API.Delegation|Failure>}
 */
export const importToken = async (input) => {
  try {
    const ucan = UCAN.parse(input);
    const root = await UCAN.write(ucan);
    return Delegation.create({ root });
  } catch (error) {
    return new Failure(String(error));
  }
};

/**
 * @param {ClientOptions} options
 * @returns Client
 */
export function createClient(options) {
  return new Client(options);
}

const DefaultClientOptions = {
  accessURL: '',
  accessDID: '',
  serviceDID: '',
  serviceURL: '',
  settings: new Map(),
};

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
    this.serviceURL = new URL(serviceURL);
    this.serviceDID = serviceDID;

    this.accessURL = new URL(accessURL);
    this.accessDID = accessDID;
    this.settings = settings;

    this.client = Store.connect({
      id: this.serviceDID,
      url: this.serviceURL,
      fetch,
    });

    this.accessClient = Access.connect({
      id: this.accessDID,
      url: this.accessURL,
      fetch,
    });
  }

  /**
   * Get the current "machine" DID
   * @async
   * @returns {Promise<API.SigningAuthority>}
   */
  async identity() {
    const secret = this.settings.get('secret') || null;
    try {
      return SigningAuthority.decode(secret);
    } catch (error) {
      const id = await SigningAuthority.generate();
      this.settings.set('secret', SigningAuthority.encode(id));
      return id;
    }
  }

  /**
   * Register a user by email.
   * @param {string|undefined} email - The email address to register with.
   */
  async register(email) {
    let savedEmail = this.settings.get('email');
    if (!savedEmail) {
      this.settings.set('email', email);
    } else if (email != savedEmail) {
      throw new Error(
        'Trying to register a second email, this is not supported yet.'
      );
    }
    if (!email) {
      throw `Invalid email provided for registration: ${email}`;
    }
    const issuer = await this.identity();
    const result = await Access.Validate.invoke({
      issuer,
      audience: this.accessClient.id,
      with: issuer.did(),
      caveats: {
        as: `mailto:${email}`,
      },
    }).execute(this.accessClient);

    const proofString = await this.checkRegistration();
    const ucan = UCAN.parse(proofString);
    const root = await UCAN.write(ucan);
    const proof = Delegation.create({ root });

    const validate = await Access.Register.invoke({
      issuer,
      audience: this.accessClient.id,
      with: proof.capabilities[0].with,
      caveats: {
        as: proof.capabilities[0].as,
      },
      proofs: [proof],
    }).execute(this.accessClient);

    if (validate?.error) {
      throw new Error(validate?.cause?.message);
    }

    return `Email registered ${email}`;
  }

  async checkRegistration() {
    const issuer = await this.identity();
    let count = 0;

    /**
     * @async
     * @throws {Error}
     * @returns {Promise<string>}
     */
    const check = async () => {
      if (count > 100) {
        throw new Error('Could not validate.');
      } else {
        count++;
        const result = await fetch(
          `${this.accessURL}validate?did=${issuer.did()}`
        );

        if (!result.ok) {
          await sleep(1000);
          return await check();
        } else {
          return await result.text();
        }
      }
    };

    return await check();
  }

  /**
   * @async
   * @returns {Promise<Result>}
   */
  async whoami() {
    const issuer = await this.identity();
    return await Access.Identify.invoke({
      issuer,
      audience: this.accessClient.id,
      with: issuer.did(),
    }).execute(this.accessClient);
  }

  /**
   * List all of the uploads connected to this user.
   * @async
   * @returns {Promise<Result>}
   */
  async list() {
    const id = await this.identity();
    return Store.List.invoke({
      issuer: id,
      audience: this.client.id,
      with: id.did(),
    }).execute(this.client);
  }

  /**
   * Upload a car via bytes.
   * @async
   * @param {Uint8Array} bytes - the url to upload
   * @returns {Promise<Result|undefined>}
   */
  async upload(bytes) {
    try {
      const id = await this.identity();
      const link = await CAR.codec.link(bytes);
      const result = await Store.Add.invoke({
        issuer: id,
        audience: this.client.id,
        with: id.did(),
        caveats: {
          link,
        },
      }).execute(this.client);

      // Return early if it was already uploaded.
      if (result.status === 'done') {
        return `Car ${link} is added to ${result.with}`;
      }

      if (result.error) {
        throw new Error(JSON.stringify(result));
      }

      // Get the returned signed URL, and upload to it.
      const response = await fetch(result.url, {
        method: 'PUT',
        mode: 'cors',
        body: bytes,
        headers: result.headers,
      });

      if (!response.ok) {
        throw new Error(
          `Failed uploading ${link} with ${response.status}: ${response.statusText}`
        );
      }
      return `Succeeded uploading ${link} with ${response.status}: ${response.statusText}`;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Remove an uploaded file by CID
   * @param {API.Link} link - the CID to remove
   */
  async remove(link) {
    const id = await this.identity();
    return await Store.Remove.invoke({
      issuer: id,
      audience: this.client.id,
      with: id.did(),
      caveats: {
        link,
      },
    }).execute(this.client);
  }

  /**
   * Remove an uploaded file by CID
   * @param {string} root - the CID to link as root.
   * @param {Array<string>} links - the CIDs to link as 'children'
   */
  async linkroot(root, links) {
    if (!root) {
      throw 'no root CID provided';
    }
    if (!links || !links.length) {
      throw 'no links provided';
    }
    console.log('calling link with ', root, links);
    const id = await this.identity();
    return await Store.LinkRoot.invoke({
      issuer: id,
      audience: this.client.id,
      with: id.did(),
      caveats: {
        rootLink: root,
        links: links,
      },
    }).execute(this.client);
  }

  /**
   * @async
   * @param {Link} link - the CID to get insights for
   * @returns {Promise<object>}
   */
  async insights(link) {
    const processResponse = await fetch(insightsAPI + '/insights', {
      method: 'POST',
      body: JSON.stringify({ cid: link }),
    }).then((res) => res.json());

    await sleep(1000);

    const insights = await fetch(insightsAPI + '/insights', {
      method: 'POST',
      body: JSON.stringify({ cid: link }),
    }).then((res) => res.json());

    return insights;
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

export default Client;
