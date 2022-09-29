import { capability, Failure, Link, URI } from '@ucanto/server'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import { canDelegateURI, derives, equalWith } from './utils.js'

export const add = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    link: Link.optional(),
    origin: Link.optional(),
  },
  derives,
})

export const remove = capability({
  can: 'store/remove',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    link: Link.optional(),
  },
  derives,
})

export const list = capability({
  can: 'store/list',
  with: URI.match({ protocol: 'did:' }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return new Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    }
    return true
  },
})

export const store = add.or(remove).or(list)
