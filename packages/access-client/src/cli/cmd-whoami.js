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
  if (await store.exists()) {
    const agent = await Agent.create({
      store,
    })
    console.log('Agent', agent.issuer.did(), agent.meta)
    console.log('Current Space', await agent.currentSpaceWithMeta())
    console.log('\nSpaces:')
    for (const space of agent.spaces) {
      console.log(
        `Name: ${space[1].name} DID: ${space[0]} Registered: ${space[1].isRegistered}`
      )
    }
    console.log('\nProofs:')
    for (const proof of await agent.proofs()) {
      for (const cap of proof.capabilities) {
        console.log(
          `With resource: ${cap.with} can "${cap.can}" expires at ${proof.expiration}`
        )
      }
    }

    console.log('\nDelegations:')
    for await (const { meta, delegation } of agent.delegationsWithMeta()) {
      console.log(`Audience ${meta.audience.name} (${meta.audience.type}):`)
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
