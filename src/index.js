import * as CAR from './patches/@ucanto/transport/car.js';
import { SigningAuthority, Authority } from '@ucanto/authority';
import { Delegation, UCAN } from '@ucanto/core';
import { Failure } from '@ucanto/validator';
import fetch from 'cross-fetch';
import { Store, Identity } from './store/index.js';

/**
 * A string representing a link to another object in IPLD
 * @typedef {string} Link
 */

/**
 * @typedef {object} ClientOptions
 * @property {string} serviceDID - The DID of the service to talk to.
 * @property {string} serviceURL - The URL of the service to talk to.
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
  constructor({ serviceDID, serviceURL, settings }) {
    this.serviceURL = new URL(serviceURL);
    this.serviceDID = serviceDID;
    this.settings = settings;

    this.client = Store.connect({
      id: this.serviceDID,
      url: this.serviceURL,
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
    const result = await Identity.Validate.invoke({
      issuer,
      audience: this.client.id,
      with: issuer.did(),
      caveats: {
        as: `mailto:${email}`,
      },
    }).execute(this.client);

    if (result?.error) {
      throw result;
    }

    return `Email registered ${email}`;
  }

  /**
   * Validate an email to token.
   * @async
   * @param {string|undefined} token - The token.
   * @return {Promise<string|undefined>}
   */
  async validate(token) {
    let savedEmail = this.settings.get('email');
    if (!savedEmail) {
      throw 'No email setup, please do so.';
    }

    if (!token) {
      throw 'Token is missing, please provide one for validation.';
    }

    if (this.settings.get('validated') == true) {
      throw 'Already validated';
    }

    const issuer = await this.identity();
    const proof = await importToken(token);

    if (proof.error) {
      throw 'Validation failed: ' + proof.message;
    }

    if (proof.audience.did() !== issuer.did()) {
      throw `Wrong token: addressed to ${proof.audience.did()} instead of ${issuer.did()}`;
    }

    const result = await Identity.Register.invoke({
      issuer,
      audience: this.client.id,
      with: proof.capabilities[0].with,
      caveats: {
        as: proof.capabilities[0].as,
      },
      proofs: [proof],
    }).execute(this.client);

    if (result?.error) {
      throw `🎫 Registration failed: ${result.message}`;
    } else {
      this.settings.set('validated', true);
    }
    return 'Validating with token succeeded.';
  }

  async whoami() {
    const issuer = await this.identity();
    return Identity.Identify.invoke({
      issuer,
      audience: this.client.id,
      with: issuer.did(),
    }).execute(this.client);
  }

  /**
   * List all of the uploads connected to this user.
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
   * Upload a file by URL.
   * @param {URL} url - the url to upload
   */
  async upload(bytes) {
    try {
      const id = await this.identity();
      //       const file = await fetch(url)
      //       const bytes = new Uint8Array(await file.arrayBuffer())
      //       console.log('tyring to upload butes', bytes)
      const link = await CAR.codec.link(bytes);
      //       const link = '123'

      console.log('what', link.toString());

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
        return `🚗 Car ${link} is added to ${id.did()}`;
      }

      if (result.error) {
        throw new Error(result);
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
          `S3Upload failed with ${response.status}: ${response.statusText}`
        );
      }
      return `S3Upload succeeded with ${response.status}: ${response.statusText}`;
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
