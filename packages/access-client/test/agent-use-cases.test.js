import assert from 'assert'
import sinon from 'sinon'
import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as Space from '@web3-storage/capabilities/space'
import { Agent, connection } from '../src/agent.js'
import {
  delegationsIncludeSessionProof,
  authorizeWaitAndClaim,
} from '../src/agent-use-cases.js'
import { createServer } from './helpers/utils.js'
import * as fixtures from './helpers/fixtures.js'
import { delegationsToBytes } from '../src/encoding.js'

describe('delegationsIncludeSessionProof', function () {
  it('should return true if and only if one of the delegations is a session proof', async function () {
    const agent = await Agent.create()
    const sessionProof = await Access.session.delegate({
      issuer: agent.issuer,
      audience: fixtures.service,
      with: fixtures.alice.did(),
    })
    const authorizeProof = await Access.authorize.delegate({
      issuer: agent.issuer,
      audience: fixtures.service,
      with: fixtures.alice.did(),
    })
    assert(!delegationsIncludeSessionProof([]))
    assert(!delegationsIncludeSessionProof([authorizeProof]))
    assert(delegationsIncludeSessionProof([sessionProof]))
    assert(delegationsIncludeSessionProof([authorizeProof, sessionProof]))
    assert(delegationsIncludeSessionProof([sessionProof, authorizeProof]))
  })
})

describe('authorizeWaitAndClaim', async function () {
  it('should execute access/authorize and then execute access/claim to get delegations', async function () {
    const authorizeHandler = sinon.fake.resolves({})
    const claimHandler = sinon.stub()

    const server = createServer({
      access: {
        authorize: Server.provide(Access.authorize, authorizeHandler),
        claim: Server.provide(Access.claim, claimHandler),
      },
    })
    const agent = await Agent.create(undefined, {
      connection: connection({ principal: server.id, channel: server }),
    })
    const spaceProofOne = await Space.space.delegate({
      issuer: agent.issuer,
      audience: agent.issuer,
      with: fixtures.alice.did(),
    })
    const sessionProof = await Access.session.delegate({
      issuer: agent.issuer,
      audience: agent.issuer,
      with: fixtures.alice.did(),
      nb: {
        proof: spaceProofOne.asCID,
      },
    })
    const authorizedDelegations = {
      delegations: {
        [spaceProofOne.cid.toString()]: delegationsToBytes([spaceProofOne]),
        [sessionProof.cid.toString()]: delegationsToBytes([sessionProof]),
      },
    }
    const spaceProofTwo = await Space.space.delegate({
      issuer: agent.issuer,
      audience: agent.issuer,
      with: fixtures.bob.did(),
    })
    const allClaimableDelegations = {
      delegations: {
        ...authorizedDelegations.delegations,
        [spaceProofTwo.cid.toString()]: delegationsToBytes([spaceProofTwo]),
      },
    }

    /**
     * the default authorizeWait strategy just polls `access/claim` so set up the handler to be called three times:
     * 1) the first time we return no delegations to get it to retry
     * 2) the second time we return the session delegations so it moves on from the authorize step
     * 3) the third time the user is claiming delegations - in most real world situations this would return the same delegations
     * as (2) but we return an extra delegation to make it easier to write tests that verify the claim step is saving proofs
     * it receives
     *
     * once we have a non-polling implementation of an AuthorizationWaiter as the default we should be able to mock
     * this being called once and returning all the claims
     */
    claimHandler
      .onFirstCall()
      .resolves({ delegations: {} })
      .onSecondCall()
      .resolves(authorizedDelegations)
      .onThirdCall()
      .resolves(allClaimableDelegations)

    assert(agent.proofs([]).length === 0)

    await authorizeWaitAndClaim(agent, 'foo@example.com')

    assert(authorizeHandler.calledOnce)
    assert(claimHandler.calledThrice)

    // make sure both space proofs are available
    assert(
      agent.proofs([
        { can: 'space/*', with: spaceProofOne.capabilities[0].with },
      ]).length > 0
    )
    assert(
      agent.proofs([
        { can: 'space/*', with: spaceProofTwo.capabilities[0].with },
      ]).length > 0
    )
  })
})
