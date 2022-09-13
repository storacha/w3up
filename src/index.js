import * as CAR from './patches/@ucanto/transport/car.js';
import { SigningAuthority, Authority } from '@ucanto/authority';
import { Delegation, UCAN } from '@ucanto/core';
import { Failure } from '@ucanto/validator';
import fetch from 'cross-fetch';
import { Store, Access } from './store/index.js';

import * as capabilities from '@web3-storage/access/capabilities';

/**
 * A string representing a link to another object in IPLD
 * @typedef {string} Link
 */

/**
 * @typedef {object} ClientOptions
 * @property {string} serviceDID - The DID of the service to talk to.
 * @property {string} serviceURL - The URL of the service to talk to.
 * @property {string} accessURL - The URL of the access service.
 * @property {string} accessDID - The DID of the access service.
 * @property {Map<string, any>} settings - A map/db of settings to use for the client.
 */

const wssInightsUrl =
  'wss://bur1whjtc7.execute-api.us-east-1.amazonaws.com/staging'; //staging url
const insightsAPI = 'https://rwj50bhvk9.execute-api.us-east-1.amazonaws.com';

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const importToken = async (input) => {
  try {
    const ucan = UCAN.parse(input);
    const root = await UCAN.write(ucan);
    return Delegation.create({ root });
  } catch (error) {
    return new Failure(String(error));
  }
};

export function createClient(options) {
  return new Client(options);
}

class Client {
  /**
   * Create an instance of the w3 client.
   * @param {ClientOptions} options
   */
  constructor({ serviceDID, serviceURL, accessURL, accessDID, settings }) {
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
   * @returns {Promise<Authority>}
   */
  async identity() {
    const secret = this.settings.get('secret') || new Uint8Array();
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
    const result = await capabilities.identityValidate
      .invoke({
        issuer,
        audience: this.accessClient.id,
        with: issuer.did(),
        caveats: {
          as: `mailto:${email}`,
        },
      })
      .execute(this.accessClient);

    const proofString = await this.checkRegistration();
    const ucan = UCAN.parse(proofString);
    const root = await UCAN.write(ucan);
    const proof = Delegation.create({ root });

    const validate = await capabilities.identityRegister
      .invoke({
        issuer,
        audience: this.accessClient.id,
        with: proof.capabilities[0].with,
        caveats: {
          as: proof.capabilities[0].as,
        },
        proofs: [proof],
      })
      .execute(this.accessClient);

    if (validate?.error) {
      throw new Error(validate?.cause?.message);
    }

    return `Email registered ${email}`;
  }

  async checkRegistration() {
    const issuer = await this.identity();
    let count = 0;

    const check = async () => {
      if (count > 100) {
        throw new Error('Could not validate.');
      } else {
        count++;
        const result = await fetch(
          `${this.accessURL}validate?did=${issuer.did()}`
        );

        if (!result.ok) {
          await new Promise((resolve, reject) =>
            setTimeout(() => resolve(), 1000)
          );
          return await check();
        } else {
          return await result.text();
        }
      }
    };

    return await check();
  }

  async whoami() {
    const issuer = await this.identity();
    return await capabilities.identityIdentify
      .invoke({
        issuer,
        audience: this.accessClient.id,
        with: issuer.did(),
      })
      .execute(this.accessClient);
  }

  /**
   * List all of the uploads connected to this user.
   */
  async list() {
    const id = await this.identity();
    return capabilities.storeList
      .invoke({
        issuer: id,
        audience: this.client.id,
        with: id.did(),
      })
      .execute(this.client);
  }

  /**
   * Upload a file by URL.
   * @param {URL} url - the url to upload
   */
  async upload(bytes) {
    try {
      const id = await this.identity();
      const link = await CAR.codec.link(bytes);
      const result = await capabilities.storeAdd
        .invoke({
          issuer: id,
          audience: this.client.id,
          with: id.did(),
          caveats: {
            link,
          },
        })
        .execute(this.client);

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
   * @param {string} link - the CID to remove
   */
  async remove(link) {
    const id = await this.identity();
    return await capabilities.storeRemove
      .invoke({
        issuer: id,
        audience: this.client.id,
        with: id.did(),
        caveats: {
          link,
        },
      })
      .execute(this.client);
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
}

export default Client;
