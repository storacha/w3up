import * as API from '../src/types.js'
import { createServer, connect } from '../src/lib.js'
import { ed25519 } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import { CID } from 'multiformats'
import { webcrypto } from '@storacha/one-webcrypto'
import { sha256 } from 'multiformats/hashes/sha2'
import * as CAR from '@ucanto/transport/car'
import * as raw from 'multiformats/codecs/raw'
import { CarWriter } from '@ipld/car'
import { Blob } from '@web-std/blob'
import { provisionProvider } from './helpers/utils.js'
import { Absentee } from '@ucanto/principal'

/** did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi */
export const alice = ed25519.parse(
  'MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM='
)
/** did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob */
export const bob = ed25519.parse(
  'MgCYbj5AJfVvdrjkjNCxB3iAUwx7RQHVQ7H1sKyHy46Iose0BEevXgL1V73PD9snOCIoONgb+yQ9sycYchQC8kygR4qY='
)
/** did:key:z6MktafZTREjJkvV5mfJxcLpNBoVPwDLhTuMg9ng7dY4zMAL */
export const mallory = ed25519.parse(
  'MgCYtH0AvYxiQwBG6+ZXcwlXywq9tI50G2mCAUJbwrrahkO0B0elFYkl3Ulf3Q3A/EvcVY0utb4etiSE8e6pi4H0FEmU='
)

export const service = ed25519
  .parse(
    'MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8='
  )
  .withDID('did:web:test.upload.storacha.network')

/**
 * @param {import('@ucanto/interface').Principal} audience
 */
export async function createSpace(audience) {
  const space = await ed25519.generate()
  const spaceDid = space.did()

  return {
    proof: await delegate({
      issuer: space,
      audience,
      capabilities: [{ can: '*', with: spaceDid }],
    }),
    space,
    spaceDid,
  }
}

/**
 * @param {API.Principal & API.Signer} audience
 * @param {import('./types.js').UcantoServerTestContext} context
 * @param {string} [username]
 */
export const registerSpace = async (audience, context, username = 'alice') => {
  const { proof, space, spaceDid } = await createSpace(audience)
  const connection = connect({
    id: context.id,
    channel: createServer(context),
  })
  const account = Absentee.from({
    id: `did:mailto:test.storacha.network:${username}`,
  })

  const provisionResult = await provisionProvider({
    service: /** @type {API.Signer<API.DID<'web'>>} */ (context.id),
    agent: /** @type {API.Signer<API.DIDKey>} */ (audience),
    space,
    account,
    connection,
  })
  if (provisionResult.out.error) {
    throw new Error(`Error provisioning space for ${audience.did()}`, {
      cause: provisionResult.out.error,
    })
  }

  return { proof, space, spaceDid, account }
}

/** @param {number} size */
export async function randomBytes(size) {
  const bytes = new Uint8Array(size)
  while (size) {
    const chunk = new Uint8Array(Math.min(size, 65_536))
    webcrypto.getRandomValues(chunk)

    size -= bytes.length
    bytes.set(chunk, size)
  }
  return bytes
}

/** @param {number} size */
export async function randomCAR(size) {
  const bytes = await randomBytes(size)
  const hash = await sha256.digest(bytes)
  const root = CID.create(1, raw.code, hash)

  const { writer, out } = CarWriter.create(root)
  void writer.put({ cid: root, bytes })
  void writer.close()

  const chunks = []
  for await (const chunk of out) {
    chunks.push(chunk)
  }
  const blob = new Blob(chunks)
  const cid = await CAR.codec.link(new Uint8Array(await blob.arrayBuffer()))

  return Object.assign(blob, { cid, roots: [root] })
}

// eslint-disable-next-line
export async function randomCID() {
  const bytes = await randomBytes(10)
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash)
}
