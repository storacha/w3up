import { SigningPrincipal } from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import { CAR } from '@ucanto/transport'
import { storeAdd } from '@web3-storage/access/capabilities'
import { connection } from '@web3-storage/access/connection'

export * from './unixfs-car'

// Production
const storeApiUrl = new URL('https://8609r1772a.execute-api.us-east-1.amazonaws.com')
const storeDid = Principal.parse('did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z')

export async function uploadCarBytes (principal: SigningPrincipal, bytes: Uint8Array): Promise<void> {
  const link = await CAR.codec.link(bytes)
  const conn = connection({
    id: storeDid,
    url: storeApiUrl
  })
  const result = await storeAdd.invoke({
    issuer: principal,
    audience: storeDid,
    with: principal.did(),
    caveats: {
      link
    }
  // @ts-expect-error @web3-storage access does not know store/* in service types
  }).execute(conn)

  // Return early if it was already uploaded.
  if (result.status === 'done') {
    return
  }

  if (result.error != null) {
    // @ts-expect-error not cause yet
    throw new Error('failed store/add invocation', { cause: result.error })
  }

  const res = await fetch(result.url, {
    method: 'PUT',
    mode: 'cors',
    body: bytes,
    headers: result.headers
  })

  if (!res.ok) {
    throw new Error('upload failed')
  }
}
