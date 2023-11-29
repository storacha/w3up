import * as assert from 'assert'
import * as didMailto from '../src/index.js'

describe('did-mailto', async () => {
  await testDidMailto(didMailto, async (name, test) => it(name, test))
})

/**
 * @param {typeof didMailto} didMailto - did-mailto module to test
 * @param {import("./test-types.js").TestAdder} test - function to call to add a named test
 */
async function testDidMailto(didMailto, test) {
  await test('module is an object', async () => {
    assert.equal(typeof didMailto, 'object')
  })
  for (const { email, did } of examples()) {
    await test(`fromEmail("${email}")`, async () => {
      assert.deepStrictEqual(didMailto.fromEmail(email), did)
    })
    await test(`toEmail("${did}")`, async () => {
      assert.deepStrictEqual(didMailto.toEmail(did), email)
    })
    await test(`toEmail(fromEmail("${email}"))`, async () => {
      assert.deepStrictEqual(
        didMailto.toEmail(didMailto.fromEmail(email)),
        email
      )
    })
    await test(`fromEmail(toEmail("${did}"))`, async () => {
      assert.deepStrictEqual(didMailto.fromEmail(didMailto.toEmail(did)), did)
    })
  }
  for (const email of validEmailAddresses()) {
    await test(`email("${email}")`, async () => {
      assert.doesNotThrow(() => didMailto.email(email), 'can parse to email')
    })
  }
}

/** @yields examples for testing */
function* examples() {
  yield {
    email: didMailto.email('example+123@example.com'),
    did: didMailto.fromString('did:mailto:example.com:example%2B123'),
  }
  yield {
    email: didMailto.email('"email@1"@example.com'),
    did: didMailto.fromString(`did:mailto:example.com:%22email%401%22`),
  }
}

/**
 * @yields many valid-but-unusual email addresses
 */
function* validEmailAddresses() {
  // https://gist.github.com/cjaoude/fd9910626629b53c4d25#file-gistfile1-txt-L5
  yield* [
    'email@example.com',
    'firstname.lastname@example.com',
    'email@subdomain.example.com',
    'firstname+lastname@example.com',
    'email@123.123.123.123',
    'email@[123.123.123.123]',
    '"email"@example.com',
    '"email@1"@example.com',
    '1234567890@example.com',
    'email@example-one.com',
    '_______@example.com',
    'email@example.name',
    'email@example.museum',
    'email@example.co.jp',
    'firstname-lastname@example.com',
  ]
  // https://gist.github.com/cjaoude/fd9910626629b53c4d25#file-gistfile1-txt-L24
  yield* [
    'much.”more\\ unusual”@example.com',
    'very.unusual.”@”.unusual.com@example.com',
    'very.”(),:;<>[]”.VERY.”very@\\ "very”.unusual@strange.example.com',
  ]
}
