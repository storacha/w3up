import assert from 'assert'
import { AgentData, getSessionProofs } from '../src/agent-data.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import { UCAN } from '@storacha/capabilities'
import { Absentee } from '@ucanto/principal'
import * as DidMailto from '@storacha/did-mailto'
import * as ucanto from '@ucanto/core'

describe('AgentData', () => {
  it('should not destructure store methods', async () => {
    const raw = (await AgentData.create()).export()
    class Store {
      async open() {}
      async close() {}
      async load() {
        return raw
      }

      async reset() {}
      async save() {
        if (!(this instanceof Store)) {
          throw new TypeError('unexpected this value')
        }
      }
    }
    const store = new Store()
    const data = await AgentData.create(undefined, { store })
    await assert.doesNotReject(data.setCurrentSpace('did:key:y'))
  })

  it('when there are several session proofs with same nb.proof, ensure both are returned', async () => {
    const agent = await ed25519.Signer.generate()
    const account = DidMailto.fromEmail(
      `test-${Math.random().toString().slice(2)}@dag.house`
    )
    const agentData = await AgentData.create()
    const serviceA = await ed25519.Signer.generate()
    const serviceAWeb = serviceA.withDID('did:web:a.up.storacha.network')
    const serviceB = await ed25519.Signer.generate()
    const serviceBWeb = serviceB.withDID('did:web:b.up.storacha.network')
    const services = [serviceAWeb, serviceBWeb]

    // note: this delegation has same CID in all loops since nothing service-specific is in the delegation
    const delegation = await ucanto.delegate({
      issuer: Absentee.from({ id: account }),
      audience: agent,
      capabilities: [
        {
          can: 'provider/add',
          with: 'ucan:*',
        },
      ],
    })
    await agentData.addDelegation(delegation)

    const mapIssuerToSession = new Map()
    for (const service of services) {
      const session = await UCAN.attest.delegate({
        issuer: service,
        audience: agent,
        with: service.did(),
        nb: { proof: delegation.cid },
      })
      await agentData.addDelegation(session)
      mapIssuerToSession.set(service.did(), session)
    }

    const gotSessions = getSessionProofs(agentData)
    assert.ok(
      delegation.cid.toString() in gotSessions,
      'sessions map has entry for delegation cid'
    )
    assert.equal(
      'object',
      typeof gotSessions[delegation.cid.toString()],
      'values of session map are objects'
    )
    assert.equal(
      Object.values(gotSessions[delegation.cid.toString()]).flat().length,
      services.length,
      'sessions map has all session proofs even when there are multiple with same .nb.proof cid'
    )
    for (const service of services) {
      assert.equal(
        gotSessions[delegation.cid.toString()][service.did()].length,
        1
      )
      assert.equal(
        gotSessions[delegation.cid.toString()][service.did()][0].cid.toString(),
        mapIssuerToSession.get(service.did()).cid.toString(),
        'index has correct session for issuer'
      )
    }
  })
})
