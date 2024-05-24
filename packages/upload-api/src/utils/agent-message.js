import * as API from '../types.js'
import { Invocation, Receipt } from '@ucanto/core'

/**
 * @typedef {API.Variant<{invocation: API.Invocation, receipt: API.Receipt}>} Member
 * @typedef {Map<string, API.IPLDBlock>} Blocks
 *
 * @typedef {object} Visitor
 * @property {Blocks} blocks
 * @property {(self: Visitor, invocation: API.Invocation) => Iterable<Member>} invocation
 * @property {(self: Visitor, receipt: API.Receipt) => Iterable<Member>} receipt
 */

/**
 * {@link API.AgentMessage} iterator.
 */
export class Iterator {
  /**
   * @param {API.AgentMessage} message
   * @param {object} [options]
   * @param {Visitor['invocation']} [options.invocation]
   * @param {Visitor['receipt']} [options.receipt]
   */
  constructor(
    message,
    { invocation = Iterator.invocation, receipt = Iterator.receipt } = {}
  ) {
    this.message = message
    this.blocks = Iterator.blocks(message)
    this.invocation = invocation
    this.receipt = receipt
  }

  *[Symbol.iterator]() {
    for (const invocation of this.message.invocations) {
      yield { invocation }
      yield* this.invocation(this, invocation)
    }

    for (const receipt of this.message.receipts.values()) {
      yield { receipt }
      yield* this.receipt(this, receipt)
    }
  }

  /**
   *
   * @param {API.AgentMessage} message
   */
  static blocks(message) {
    return new Map(
      [...message.iterateIPLDBlocks()].map((block) => [`${block.cid}`, block])
    )
  }

  /**
   * Iterates all embedded invocations & receipts of the given receipt using the
   * provided visitor.
   *
   * @param {Visitor} iterator
   * @param {API.Receipt} receipt
   * @returns {Iterable<Member>}
   */
  static *receipt(iterator, receipt) {
    // Also index all the invocations that were scheduled as effects
    const invocations = [
      receipt.ran,
      ...receipt.fx.fork,
      ...(receipt.fx.join ? [receipt.fx.join] : []),
    ]

    for (const invocation of invocations.filter(Invocation.isInvocation)) {
      yield { invocation }
      yield* iterator.invocation(iterator, invocation)
    }
  }

  /**
   * Iterates all embedded invocations & receipts of the given invocation using the
   * provided visitor.
   *
   * @param {Visitor} iterator
   * @param {API.Invocation} invocation
   * @returns {Iterable<Member>}
   */
  static *invocation(iterator, invocation) {
    if (invocation.capabilities[0].can === 'ucan/conclude') {
      const { receipt: root } = Object(invocation.capabilities[0].nb)

      const receipt = root
        ? Receipt.view(
            {
              root,
              blocks: iterator.blocks,
            },
            null
          )
        : null

      if (receipt) {
        yield { receipt }
        yield* iterator.receipt(iterator, receipt)
      }
    }
  }
}

/**
 * Iterates over all the invocations and receipts contained by the given
 * message regardless of their nesting.
 *
 * @param {API.AgentMessage} message
 * @param {object} [options]
 * @param {Visitor['invocation']} [options.invocation]
 * @param {Visitor['receipt']} [options.receipt]
 * @returns {Iterable<Member>}
 */
export function* iterate(message, options) {
  yield* new Iterator(message, options)
}

/**
 * @param {API.AgentMessage} message
 * @returns {Iterable<API.AgentMessageIndexRecord>}
 */
export const index = function* (message) {
  const source = message.root.cid
  for (const { receipt, invocation } of iterate(message)) {
    if (invocation) {
      // TODO: actually derive task CID
      const task = invocation.link()
      yield {
        invocation: {
          task,
          invocation,
          message: source,
        },
      }
    }

    if (receipt) {
      yield {
        receipt: {
          task: receipt.ran.link(),
          receipt,
          message: source,
        },
      }
    }
  }
}
