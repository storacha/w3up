import { UcanChain } from 'ucan-storage/ucan-chain'
import { KeyPair } from 'ucan-storage/keypair'

/**
 * @type {import('ucan-storage/types').CapabilitySemantics<any>}
 */
export const accessSemantics = {
  tryParsing(cap) {
    return cap
  },

  tryDelegating(parentCap, childCap) {
    return childCap
  },
}

export class Service {
  /**
   * @param {KeyPair} keypair
   */
  constructor(keypair) {
    this.keypair = keypair
  }

  /**
   * @param {string} key
   */
  static async fromPrivateKey(key) {
    const kp = await KeyPair.fromExportedKey(key)
    return new Service(kp)
  }

  static async create() {
    return new Service(await KeyPair.create())
  }

  /**
   * Validates UCAN for capability
   *
   * @param {string} encodedUcan
   */
  async validate(encodedUcan) {
    const token = await UcanChain.fromToken(encodedUcan, {})

    if (token.audience() !== this.did()) {
      throw new Error('Invalid UCAN: Audience does not match this service.')
    }

    const caps = token.caps(accessSemantics)

    if (caps.length > 1) {
      throw new Error('Invocation ucan should have only 1 cap.')
    }

    const cap = caps[0]
    const root = cap.root

    if (root.issuer() !== this.did()) {
      throw new Error('Invalid UCAN: Root issuer does not match this service.')
    }

    return cap
  }

  did() {
    return this.keypair.did()
  }
}
