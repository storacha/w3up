import * as UCAN from '@ipld/dag-ucan'
import { SigningAuthority } from '@ucanto/authority'
import anyTest from 'ava'
import { Delegation } from '@ucanto/core'
import { connection as w3connection } from '@web3-storage/access/connection'
import { Miniflare } from 'miniflare'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import * as caps from '@web3-storage/access/capabilities'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '..', '.env.tpl'),
})
/**
 * @typedef {import("ava").TestFn<{mf: mf}>} TestFn
 */

// eslint-disable-next-line unicorn/prefer-export-from
export const test = /** @type {TestFn} */ (anyTest)

export const bindings = {
  ENV: 'test',
  DEBUG: 'false',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  POSTMARK_TOKEN: process.env.POSTMARK_TOKEN || '',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOGTAIL_TOKEN: process.env.LOGTAIL_TOKEN || '',
  W3ACCESS_METRICS: createAnalyticsEngine(),
}

export const mf = new Miniflare({
  packagePath: true,
  wranglerConfigPath: true,
  sourceMap: true,
  bindings,
})

export function createAnalyticsEngine() {
  /** @type {Map<string,import('../../src/bindings').AnalyticsEngineEvent>} */
  const store = new Map()

  return {
    writeDataPoint: (
      /** @type {import('../../src/bindings').AnalyticsEngineEvent} */ event
    ) => {
      store.set(
        `${Date.now()}${(Math.random() + 1).toString(36).slice(7)}`,
        event
      )
    },
    _store: store,
  }
}

export const serviceAuthority = SigningAuthority.parse(bindings.PRIVATE_KEY)

/**
 * @param {UCAN.UCAN<UCAN.Capability<UCAN.Ability, `${string}:${string}`>>} ucan
 */
export async function send(ucan) {
  return mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UCAN.format(ucan)}`,
    },
  })
}

/**
 * @param {import("@ucanto/interface").SigningAuthority<237> } id
 */
export function connection(id) {
  return w3connection({
    id,
    url: new URL('http://localhost:8787'),
    fetch: mf.dispatchFetch.bind(mf),
  })
}

/**
 * @param {import("@ucanto/interface").ConnectionView<import('@web3-storage/access/src/types').Service>} con
 * @param {import("@ucanto/interface").SigningAuthority<237>} kp
 * @param {string} email
 */
export async function validateEmail(con, kp, email) {
  const validate = caps.identityValidate.invoke({
    audience: serviceAuthority,
    issuer: kp,
    caveats: {
      as: `mailto:${email}`,
    },
    with: kp.did(),
  })

  const out = await validate.execute(con)
  if (out?.error) {
    throw out
  }
  // @ts-ignore
  const ucan = UCAN.parse(
    // @ts-ignore
    out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  )
  const root = await UCAN.write(ucan)
  const proof = Delegation.create({ root })

  return proof
}

/**
 * @param {import("@ucanto/interface").ConnectionView<import('@web3-storage/access/src/types').Service>} con
 * @param {import("@ucanto/interface").SigningAuthority<237>} kp
 * @param {import("@ucanto/interface").Proof<[UCAN.Capability<UCAN.Ability, `${string}:${string}`>, ...UCAN.Capability<UCAN.Ability, `${string}:${string}`>[]]>} proof
 */
export async function register(con, kp, proof) {
  const register = caps.identityRegister.invoke({
    audience: serviceAuthority,
    issuer: kp,
    // @ts-ignore
    with: proof.capabilities[0].with,
    caveats: {
      // @ts-ignore
      as: proof.capabilities[0].as,
    },
    proofs: [proof],
  })

  await register.execute(con)
}
