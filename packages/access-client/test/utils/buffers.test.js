import assert from 'assert'
import { uint8ArrayToArrayBuffer } from '../../src/utils/buffers.js'

/**
 *
 * @param {any[]} array
 * @returns ArrayBuffer
 */
function arrayBufferFromArray(array) {
  return Uint8Array.from(array).buffer
}

describe('uint8ArrayToArrayBuffer', function () {
  it('should convert an empty Uint8Array to an empty ArrayBuffer', function () {
    assert.deepEqual(
      uint8ArrayToArrayBuffer(Uint8Array.from([])),
      new ArrayBuffer(0)
    )
  })

  it('should convert a Uint8Array with a few elements to an ArrayBuffer with the same elements', function () {
    assert.deepEqual(
      uint8ArrayToArrayBuffer(Uint8Array.from([1, 2, 3])),
      arrayBufferFromArray([1, 2, 3])
    )
  })

  it('should return the ArrayBuffer instance underlying the Uint8Array if the Uint8Array represents the whole array', function () {
    const uint8Array = Uint8Array.from([1, 2, 3])
    assert.strictEqual(uint8ArrayToArrayBuffer(uint8Array), uint8Array.buffer)
  })

  it('should convert a Uint8Array that is a view over an ArrayBuffer to an ArrayBuffer with the same elements', function () {
    const originalArrayBuffer = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]).buffer
    const uint8Array = new Uint8Array(originalArrayBuffer, 3, 3)
    assert.deepEqual(
      uint8ArrayToArrayBuffer(uint8Array),
      arrayBufferFromArray([4, 5, 6])
    )
  })
})

// this test simply verifies that a Uint8Array doesn't make a copy of an ArrayBuffer
// passed to its constructor - technically this is verifying the implementation
// of the JavaScript platform behaves as advertised, but it's an important part
// of our performance assumptions about AgentData so worth proving here
describe('new Uint8Array()', function () {
  it('should use a passed ArrayBuffer as its underlying buffer', function () {
    const arrayBuffer = arrayBufferFromArray([1, 2, 3])
    assert.strictEqual(new Uint8Array(arrayBuffer).buffer, arrayBuffer)
  })
})
