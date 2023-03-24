import { context } from './helpers/context.js'
import * as assert from 'assert'
import { Delegation } from '@ucanto/core'
import { Access } from '@web3-storage/capabilities'
import { delegationToString } from '@web3-storage/access/encoding'
import { getRandomValues } from 'crypto'
import { writeFileSync } from 'fs'

describe('validate-email', () => {
  it('can POST /validate-email?mode=authorize', async () => {
    const { mf, service, issuer: agent } = await context()
    const accountDid = /** @type {const} */ (`did:mailto:dag.house:foo`)
    // add extra bytes to make it really big
    // and maybe trigger errors encoding big things
    const extraBytes = getRandomValues(new Uint8Array(10 * 1024))
    const ucan = await Delegation.delegate({
      issuer: service,
      audience: service,
      capabilities: [
        Access.confirm.create({
          with: service.did(),
          nb: {
            iss: accountDid,
            aud: agent.did(),
            att: [
              { can: '*' },
              // validate-email may pass this value unmodified into qr
              {
                can: `data:text/plain;base64,${btoa(
                  String.fromCodePoint(...extraBytes)
                )}`,
              },
            ],
          },
        }),
      ],
    })
    const validateEmailUrl = (() => {
      const url = new URL(`http://localhost:8787/validate-email`)
      url.searchParams.set('mode', 'authorize')
      url.searchParams.set('ucan', delegationToString(ucan))
      return url
    })()
    const response = await mf.dispatchFetch(validateEmailUrl, {
      method: 'post',
    })
    assert.deepEqual(response.status, 200)
    const relPath = new URL('snapshots/validate-email.html', import.meta.url)
    writeFileSync(relPath, await response.text())
  })
})
