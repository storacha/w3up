import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Deal from '../../src/deal.js'
import { bobAccount, service, alice } from '../helpers/fixtures.js'
import { base64 } from 'multiformats/bases/base64'
import { CBOR } from '@ucanto/core'

describe('deal/sign', () => {
  it.only('can be created', async () => {
    const bytes = base64.baseDecode(
      'i9gqWCgAAYHiA5IgIGqqcbfkfeHyoBH/CkAziiM2HrrxRau2SKjYSv55vjgUGQEA9VUCRxawI7f+hLbn3NowPD11SxqP8vxVAkcWsCO3/oS259zaMDw9dUsaj/L8YAAAQEBA'
    )

    const payload = CBOR.decode(bytes)
    // const proposal = Deal.Proposal.create({})

    console.log(payload)
    console.log(new TextDecoder().decode(payload[3]))

    // const tuple = Deal.ProposalV2.from(payload)
    // console.log(tuple)
  })
})
