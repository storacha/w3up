import * as Test from './test.js'
import * as Access from '../src/capability/access.js'
import * as Result from '../src/result.js'

export const testAccess = Test.withContext({
  'capability.access.request': async (
    assert,
    { client, mail, grantAccess }
  ) => {
    const email = 'alice@web.mail'

    const account = Access.DIDMailto.fromEmail(email)
    const request = Result.try(
      await client.capability.access.request({ account })
    )
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)

    assert.deepEqual(request.audience, client.did())
    assert.ok(request.expiration.getTime() >= Date.now())

    const access = Result.try(await request.claim())
    assert.ok(access.proofs.length > 0)

    const proofs = client.proofs()
    assert.deepEqual(proofs.length, 0)

    await access.save()
    assert.ok(client.proofs().length > 0)
  },
})

Test.test({ Access: testAccess })
