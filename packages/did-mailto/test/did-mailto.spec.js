import * as assert from 'assert'
import * as didMailtoModule from '../src/index.js'

describe('did-mailto', () => {
  testDidMailto(didMailtoModule, async (name, test) => it(name, test))
})

/**
 * @param {typeof didMailtoModule} didMailtoModule
 * @param {import("./test-types").TestAdder} test
 */
function testDidMailto(didMailtoModule, test) {
  test('module is an object', async () => {
    assert.equal(typeof didMailtoModule, 'object')
  })
  for (const { email, didMailto } of examples()) {
    test(`fromEmail("${email}")`, async () => {
      assert.deepStrictEqual(
        didMailtoModule.fromEmail(email),
        didMailtoModule.fromString(didMailto)
      )
    })
    test(`toEmail("${didMailto}")`, async () => {
      assert.deepStrictEqual(
        didMailtoModule.toEmail(didMailtoModule.fromString(didMailto)),
        email
      )
    })
  }
  for (const email of validEmailAddresses()) {
    test(`email("${email}")`, async () => {
      assert.doesNotThrow(
        () => didMailtoModule.email(email),
        'can parse to email'
      )
    })
  }
}

function* examples() {
  yield {
    email: didMailtoModule.email('example+123@example.com'),
    didMailto: 'did:mailto:example.com:example%2B123',
  }
  yield {
    email: didMailtoModule.email('"email@1"@example.com'),
    didMailto: `did:mailto:example.com:%22email%401%22`,
  }
}

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
