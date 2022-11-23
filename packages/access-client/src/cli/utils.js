// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { Verifier } from '@ucanto/principal/ed25519'
import inquirer from 'inquirer'

/** @type {Record<string,string>} */
const envs = {
  production: 'https://access.web3.storage',
  staging: 'https://w3access-staging.protocol-labs.workers.dev',
  dev: 'https://w3access-dev.protocol-labs.workers.dev',
  local: 'http://127.0.0.1:8787',
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
  if (audience) {
    return { url, did: audience }
  } else {
    const rsp = await fetch(url + 'version')

    // @ts-ignore
    const { did } = await rsp.json()
    audience = Verifier.parse(did)
    return { url, audience }
  }
}

/**
 * @template {Ucanto.Signer} T
 * @param {import('../agent').Agent<T>} agent
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
