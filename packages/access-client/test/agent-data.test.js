import assert from 'assert'
import { AgentData, getSessionProofs } from '../src/agent-data.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import { Access } from '@web3-storage/capabilities'
import { Absentee } from '@ucanto/principal'
import * as DidMailto from '@web3-storage/did-mailto'
import * as ucanto from '@ucanto/core'

describe('AgentData', () => {
  it('should not destructure store methods', async () => {
    // eslint-disable-next-line unicorn/no-await-expression-member
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
    const serviceAWeb = serviceA.withDID('did:web:a.up.web3.storage')
    const serviceB = await ed25519.Signer.generate()
    const serviceBWeb = serviceB.withDID('did:web:b.up.web3.storage')
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
    agentData.addDelegation(delegation)

    for (const service of services) {
      const session = await Access.session.delegate({
        issuer: service,
        audience: agent,
        with: service.did(),
        nb: { proof: delegation.cid },
      })
      agentData.addDelegation(session)
    }

    const gotSessions = getSessionProofs(agentData)
    assert.ok(
      delegation.cid.toString() in gotSessions,
      'sessions map has entry for delegation cid'
    )
    assert.ok(
      Array.isArray(gotSessions[delegation.cid.toString()]),
      'values of session map are Arrays'
    )
    assert.equal(
      gotSessions[delegation.cid.toString()].length,
      services.length,
      'sessions map has all session proofs even when there are multiple with same .nb.proof cid'
    )
  })
})
