#!/usr/bin/env node

import { create } from '@web3-storage/w3up-client'
import { delegate } from '@ucanto/core'
import { Absentee } from '@ucanto/principal'
import * as DidMailto from '@web3-storage/did-mailto'

const CURRENT_EMAIL = 'yourcurrentemail@example.com'
const NEW_EMAIL = 'yournewemail@example.com'
const SPACE_DID_TO_DELEGATE = 'did:key:asdf'

const newAccountDID = DidMailto.fromEmail(NEW_EMAIL)

const client = await create()
await client.login(CURRENT_EMAIL)


// Register a delegation with the service that grants all capabilities on 
// the given space to NEW_EMAIL.
// 
// The resulting delegation will delegate from CURRENT_EMAIL to the local agent
// and then to NEW_EMAIL which is a little ugly.
await client.capability.access.delegate({
  space: SPACE_DID_TO_DELEGATE,
  delegations:
    [await delegate({
      issuer: client.agent.issuer,
      audience: Absentee.from({ id: newAccountDID }),
      capabilities: [{
        with: SPACE_DID_TO_DELEGATE,
        can: '*'
      }]
    })]
})
