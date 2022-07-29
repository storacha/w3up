import { Authority } from '@ucanto/server'

export const url = new URL('https://access.web3.storage')

// TODO: get production did
export const identity = Authority.parse(
  'did:key:z6MksafxoiEHyRF6RsorjrLrEyFQPFDdN6psxtAfEsRcvDqx'
)
