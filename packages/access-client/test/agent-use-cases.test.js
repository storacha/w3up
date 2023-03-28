import assert from 'assert'
import sinon from 'sinon'
import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import { space } from '@web3-storage/capabilities/space'
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
    const spaceProof = await space.delegate({
      issuer: agent.issuer,
      audience: agent.issuer,
      with: fixtures.alice.did(),
    })
    const sessionProof = await Access.session.delegate({
      issuer: agent.issuer,
      audience: agent.issuer,
      with: fixtures.alice.did(),
      nb: {
        proof: spaceProof.asCID,
      },
    })
    const authorizedDelegations = {
      delegations: {
        [sessionProof.cid.toString()]: delegationsToBytes([sessionProof]),
      },
    }
    claimHandler
      .onFirstCall()
      .resolves({ delegations: {} })
      .onSecondCall()
      .resolves(authorizedDelegations)
      .onThirdCall()
      .resolves(authorizedDelegations)

    await authorizeWaitAndClaim(agent, 'foo@example.com')

    assert(authorizeHandler.calledOnce)
    assert(claimHandler.calledThrice)
  })
})
