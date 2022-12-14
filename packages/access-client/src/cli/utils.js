// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { DID } from '@ucanto/core'
import inquirer from 'inquirer'

/** @type {Record<string,string>} */
const envs = {
  production: 'https://access.web3.storage',
  staging: 'https://w3access-staging.protocol-labs.workers.dev',
  dev: 'https://w3access-dev.protocol-labs.workers.dev',
  local: 'http://127.0.0.1:8787',
}

/** @type {Record<string,string>} */
const dids = {
  production: 'did:web:web3.storage',
  staging: 'did:web:staging.web3.storage',
  dev: 'did:web:dev.web3.storage',
}

/**
 * @type {import("@ucanto/interface").Principal}
 */
let audience

/**
 * @param {string} env
 */
export async function getService(env) {
  const url = new URL(envs[env])
  let did

  if (audience) {
    return { url, servicePrincipal: audience }
  } else {
    if (env === 'local') {
      const rsp = await fetch(url + 'version')
      const data = await rsp.json()
      did = data.did
    } else {
      did = dids[env]
    }

    // @ts-ignore
    audience = DID.parse(did)
    return { url, servicePrincipal: audience }
  }
}

/**
 * @template {Ucanto.Signer} T
 * @param {import('../agent').Agent} agent
 */
export async function selectSpace(agent) {
  const choices = []
  for (const [key, value] of agent.spaces) {
    choices.push({ name: value.name, value: key })
  }
  const { space } = await inquirer.prompt([
    {
      type: 'list',
      name: 'space',
      choices,
      message: 'Select space:',
    },
  ])

  return space
}
