import { parseLink } from '@ucanto/core'
import { Absentee } from '@ucanto/principal'
import { Signer } from '@ucanto/principal/ed25519'

/** did:key:z6Mkqa4oY9Z5Pf5tUcjLHLUsDjKwMC95HGXdE1j22jkbhz6r */
export const alice = Signer.parse(
  'MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM='
)

export const aliceAccount = Absentee.from({
  id: 'did:mailto:test.storacha.network:alice',
})

/** did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob */
export const bob = Signer.parse(
  'MgCYbj5AJfVvdrjkjNCxB3iAUwx7RQHVQ7H1sKyHy46Iose0BEevXgL1V73PD9snOCIoONgb+yQ9sycYchQC8kygR4qY='
)

export const bobAccount = Absentee.from({
  id: 'did:mailto:test.storacha.network:bob',
})

/** did:key:z6MktafZTREjJkvV5mfJxcLpNBoVPwDLhTuMg9ng7dY4zMAL */
export const mallory = Signer.parse(
  'MgCYtH0AvYxiQwBG6+ZXcwlXywq9tI50G2mCAUJbwrrahkO0B0elFYkl3Ulf3Q3A/EvcVY0utb4etiSE8e6pi4H0FEmU='
)

export const malloryAccount = Absentee.from({
  id: 'did:mailto:test.storacha.network:mallory',
})

export const service = Signer.parse(
  'MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8='
).withDID('did:web:test.up.storacha.network')

export const readmeCID = parseLink(
  'bafybeihqfdg2ereoijjoyrqzr2x2wsasqm2udurforw7pa3tvbnxhojao4'
)

export const gateway = Signer.parse(
  'MgCaNpGXCEX0+BxxE4SjSStrxU9Ru/Im+HGNQ/JJx3lDoI+0B3NWjWW3G8OzjbazZjanjM3kgfcZbvpyxv20jHtmcTtg=' // random key
).withDID('did:web:w3s.link')

/** did:key:z6MktYxTNoCxrXhK9oS5PdzutujTJ5DaS3FWYxNpRTXwrH6h */
export const space = Signer.parse(
  'MgCYBaaeyfAHFNt5+M07rY9pPLnmhyxvMEj5jdyAN0ajSlO0B0Xk2fW+t/EsB2nqWraDmB7N0NiTXKZaVBbOpCMtCktI=' // random key
)
