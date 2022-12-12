/* eslint-disable no-console */
import { Agent } from '../agent.js'
import { expirationToDate } from '../encoding.js'
import { StoreConf } from '../stores/store-conf.js'
import { NAME } from './config.js'

/**
 * @param {{ profile: any; env : string }} opts
 */
export async function cmdWhoami(opts) {
  const store = new StoreConf({ profile: opts.profile })
  const data = await store.load()
  if (data) {
    const agent = Agent.from(data, { store })
    console.log('Agent', agent.issuer.did(), agent.meta)
    console.log('Current Space', agent.currentSpaceWithMeta())
    console.log('\nSpaces:')
    for (const space of agent.spaces) {
      console.log(
        `Name: ${space[1].name ?? 'none'} DID: ${space[0]} Registered: ${
          space[1].isRegistered
        }`
      )
    }
    console.log('\nProofs:')
    for (const proof of agent.proofs()) {
      for (const cap of proof.capabilities) {
        console.log(
          `With resource: ${cap.with} can "${cap.can}" expires at ${proof.expiration}`
        )
      }
    }

    console.log('\nDelegations:')
    for (const { meta, delegation } of agent.delegationsWithMeta()) {
      console.log(
        `Audience ${meta.audience?.name ?? 'unknown'} (${
          meta.audience?.type ?? 'unknown'
        }):`
      )
      for (const cap of delegation.capabilities) {
        const expires = expirationToDate(delegation.expiration)
        console.log(
          `With resource: ${cap.with} can "${cap.can}" expires at ${
            expires ? expires.toISOString() : 'never'
          }`
        )
      }
    }
  } else {
    console.error(`Run "${NAME} setup" first`)
  }
}
