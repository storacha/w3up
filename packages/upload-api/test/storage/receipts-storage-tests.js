import * as API from '../../src/types.js'
import { getReceipts } from '../helpers/receipts.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'should persist and retrieve receipt': async (assert, context) => {
    const receipts = await getReceipts()
    const storage = context.receiptsStorage

    // Store receipts
    await Promise.all(
      // @ts-expect-error no specific receipt types
      receipts.map((r) => storage.put(r))
    )
    // Get receipt
    const r = await storage.get(receipts[0].ran.link())
    assert.ok(r.ok)
  },
  'should fail with not found error when no receipt is available': async (
    assert,
    context
  ) => {
    const receipts = await getReceipts()
    const storage = context.receiptsStorage

    const r = await storage.get(receipts[0].ran.link())
    assert.ok(r.error)
    assert.equal(r.error?.name, 'ReceiptNotFound')
  },
}
