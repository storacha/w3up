import * as API from '../../src/types.js'

import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@storacha/capabilities/space/blob'
import { Console } from '@storacha/capabilities'

import { alice, registerSpace } from '../util.js'
import { Message, Receipt } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import { createConcludeInvocation } from '../../src/ucan/conclude.js'
import * as AgentMessage from '../../src/utils/agent-message.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'receipt should be stored for executed task': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const { agentStore, connection } = context

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    // invoke `blob/add`
    const blobAdd = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          digest,
          size,
        },
      },
      proofs: [proof],
    })
    // Invoke `blob/add`
    const receipt = await blobAdd.execute(connection)
    if (!receipt.out.ok) {
      throw new Error('invocation failed', { cause: receipt })
    }

    const read = await agentStore.receipts.get(receipt.ran.link())
    assert.ok(read.ok)

    assert.deepEqual(read.ok?.link(), receipt.link())
  },
  'invoked task should be stored': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const { agentStore, connection } = context

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    // invoke `blob/add`
    const blobAdd = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          digest,
          size,
        },
      },
      proofs: [proof],
    })
    // Invoke `blob/add`
    const receipt = await blobAdd.execute(connection)
    if (!receipt.out.ok) {
      throw new Error('invocation failed', { cause: receipt })
    }

    const result = await agentStore.invocations.get(receipt.ran.link())
    assert.ok(result.ok)

    assert.deepEqual(result.ok, /** @type {API.Invocation} */ (receipt.ran))
  },

  'could receive message with an existing invocation': async (
    assert,
    context
  ) => {
    const hi = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          value: 'hi',
        },
      })
      .delegate()

    const bye = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          value: 'bye',
        },
      })
      .delegate()

    const [hiReceipt] = await context.connection.execute(hi)
    assert.ok(hiReceipt.out.ok)

    const storedHi = await context.agentStore.invocations.get(hi.link())
    assert.deepEqual(storedHi.ok?.link().toString(), hi.link().toString())

    const storedHiReceipt = await context.agentStore.receipts.get(hi.link())
    assert.equal(
      storedHiReceipt.ok?.ran.link().toString(),
      hi.link().toString()
    )

    const [byeReceipt, hiReceipt2] = await context.connection.execute(bye, hi)

    assert.deepEqual(hiReceipt2.ran.link().toString(), hi.link().toString())
    assert.ok(byeReceipt.out.ok)

    const storedBye = await context.agentStore.invocations.get(bye.link())
    assert.deepEqual(storedBye.ok?.link().toString(), bye.link().toString())

    const storedByeReceipt = await context.agentStore.receipts.get(bye.link())
    assert.equal(
      storedByeReceipt.ok?.ran.link().toString(),
      bye.link().toString()
    )

    const restoredBye = await context.agentStore.receipts.get(bye.link())
    assert.equal(restoredBye.ok?.ran.link().toString(), bye.link().toString())
  },

  'invocations embedded in receipts should be indexed': async (
    assert,
    context
  ) => {
    const hi = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          value: 'hi',
        },
      })
      .delegate()

    const receipt = await Receipt.issue({
      issuer: context.id,
      ran: hi,
      result: { ok: {} },
    })

    const message = await Message.build({
      receipts: [receipt],
    })

    const result = await context.agentStore.messages.write({
      data: message,
      source: CAR.request.encode(message),
      index: AgentMessage.index(message),
    })
    assert.ok(result.ok)

    const storedReceipt = await context.agentStore.receipts.get(
      receipt.ran.link()
    )
    assert.deepEqual(
      storedReceipt.ok?.link().toString(),
      receipt.link().toString(),
      'receipt was stored and indexed by invocation'
    )

    const storedInvocation = await context.agentStore.invocations.get(
      receipt.ran.link()
    )

    assert.deepEqual(
      storedInvocation.ok?.link().toString(),
      hi.link().toString(),
      'invocation was stored and indexed by invocation'
    )
  },

  'receipt in the ucan/conclude should be indexed': async (assert, context) => {
    const hi = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          value: 'hi',
        },
      })
      .delegate()

    const receipt = await Receipt.issue({
      issuer: context.id,
      ran: hi,
      result: { ok: {} },
    })

    const conclude = await createConcludeInvocation(
      context.id,
      context.id,
      receipt
    ).delegate()

    const message = await Message.build({
      invocations: [conclude],
    })

    const result = await context.agentStore.messages.write({
      data: message,
      source: CAR.request.encode(message),
      index: AgentMessage.index(message),
    })
    assert.ok(result.ok)

    const storedReceipt = await context.agentStore.receipts.get(
      receipt.ran.link()
    )
    assert.deepEqual(
      storedReceipt.ok?.link().toString(),
      receipt.link().toString(),
      'receipt was stored and indexed by invocation'
    )

    const storedInvocation = await context.agentStore.invocations.get(
      receipt.ran.link()
    )

    assert.deepEqual(
      storedInvocation.ok?.link().toString(),
      hi.link().toString(),
      'invocation was stored and indexed by invocation'
    )

    const storedConclude = await context.agentStore.invocations.get(
      conclude.link()
    )

    assert.deepEqual(
      storedConclude.ok?.link().toString(),
      conclude.link().toString(),
      'store conclude invocation was stored and indexed by invocation'
    )
  },
}
