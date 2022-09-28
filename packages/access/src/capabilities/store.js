import { capability, Failure, Link, URI } from '@ucanto/server'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import { canDelegateURI, derives, equalWith } from './utils.js'

export const add = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const remove = capability({
  can: 'store/remove',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const list = capability({
  can: 'store/list',
  with: URI.match({ protocol: 'did:' }),
  derives: (claimed, delegated) => {
    if (claimed.uri.href !== delegated.uri.href) {
      return new Failure(
        `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
      )
    }
    return true
  },
})

export const store = add.or(remove).or(list)
