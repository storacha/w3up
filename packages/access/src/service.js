import { Authority } from '@ucanto/server'

export const url = new URL('https://access-api.web3.storage')

// TODO: get production did
export const identity = Authority.parse(
  'did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9'
)
