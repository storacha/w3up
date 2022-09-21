import { Principal } from '@ucanto/principal'

export const url = new URL('https://access-api.web3.storage')

// TODO: get production did
export const identity = Principal.parse(
  'did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9'
)
