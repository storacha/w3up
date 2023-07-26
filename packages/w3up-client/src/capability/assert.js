import { Assert } from '@web3-storage/content-claims/capability'
import { Base } from '../base.js'

/**
 * Client for interacting with the content claim `assert/*` capabilities.
 */
export class AssertClient extends Base {
  /**
   * Claims that a CID is available at a URL.
   *
   * @param {import('multiformats').UnknownLink} content - Claim subject.
   * @param {URL[]} location - Location(s) the content may be found.
   */
  async location(content, location) {
    const conf = await this._invocationConfig([Assert.location.can])
    const locs = location.map(l => /** @type {import('@ucanto/interface').URI} */ (l.toString()))
    const result = await Assert.location
      .invoke({ ...conf, nb: { content, location: locs } })
      .execute(this._serviceConf.claim)
    if (result.out.error) {
      const cause = result.out.error
      throw new Error(`failed ${Assert.location.can} invocation`, { cause })
    }
    return result.out.ok
  }

  /**
   * Claims that a CID's graph can be read from the blocks found in parts.
   *
   * @param {import('multiformats').UnknownLink} content - Claim subject.
   * @param {import('multiformats').Link|undefined} blocks - CIDs CID.
   * @param {import('multiformats').Link[]} parts - CIDs of CAR files the content can be found within.
   */
  async partition(content, blocks, parts) {
    const conf = await this._invocationConfig([Assert.partition.can])
    const result = await Assert.partition
      .invoke({ ...conf, nb: { content, blocks, parts } })
      .execute(this._serviceConf.claim)
    if (result.out.error) {
      const cause = result.out.error
      throw new Error(`failed ${Assert.partition.can} invocation`, { cause })
    }
    return result.out.ok
  }

  /**
   * Claims that a CID includes the contents claimed in another CID.
   * 
   * @param {import('multiformats').UnknownLink} content - Claim subject.
   * @param {import('multiformats').Link} includes - Contents the claim content includes.
   * @param {import('multiformats').Link} [proof] - Inclusion proof.
   */
  async inclusion(content, includes, proof) {
    const conf = await this._invocationConfig([Assert.inclusion.can])
    const result = await Assert.inclusion
      .invoke({ ...conf, nb: { content, includes, proof } })
      .execute(this._serviceConf.claim)

    if (result.out.error) {
      const cause = result.out.error
      throw new Error(`failed ${Assert.inclusion.can} invocation`, { cause })
    }

    return result.out.ok
  }

  /**
   * Claim that a CID is linked to directly or indirectly by another CID.
   *
   * @param {import('multiformats').UnknownLink} content - Claim subject.
   * @param {import('multiformats').UnknownLink} ancestor - Ancestor content CID.
   */
  async descendant(content, ancestor) {
    const conf = await this._invocationConfig([Assert.descendant.can])
    const result = await Assert.descendant
      .invoke({ ...conf, nb: { content, ancestor } })
      .execute(this._serviceConf.claim)

    if (result.out.error) {
      const cause = result.out.error
      throw new Error(`failed ${Assert.descendant.can} invocation`, { cause })
    }

    return result.out.ok
  }
}
