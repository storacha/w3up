/* eslint-disable no-console */
// import { StoreConf } from '../stores/store-conf.js'
// import { NAME } from './config.js'

/**
 * @param {{ profile: any; env : string }} opts
 */
export async function cmdWhoami(opts) {
  // const store = new StoreConf({ profile: opts.profile })
  // if (await store.exists()) {
  //   const { delegations, meta, accounts, principal } = await store.load()
  //   console.log('Agent', principal.did(), meta)
  //   console.log('Accounts:')
  //   for (const acc of accounts) {
  //     console.log(acc.did())
  //   }
  //   console.log('Delegations created:')
  //   for (const created of delegations.created) {
  //     console.log(created)
  //   }
  //   console.log('Delegations received:')
  //   for (const [key, value] of delegations.receivedByResource) {
  //     console.log(
  //       `Resource: ${key}`,
  //       value.map((cap) => cap.cap.can)
  //     )
  //   }
  // } else {
  //   console.error(`Run "${NAME} setup" first`)
  // }
}
