import * as Server from '@ucanto/server'
import { capability, Link, URI, Failure } from '@ucanto/server'
import * as API from '../type.js'

/**
 * @template {Server.ParsedCapability<"store/add"|"store/remove", Server.API.URI<'did:'>, {link?: API.Store.Link<unknown, number, number, 0|1>}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns
 */
const derives = (claimed, delegated) => {
  if (claimed.uri.href !== delegated.uri.href) {
    return new Failure(
      `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
    )
  } else if (
    delegated.caveats.link &&
    `${delegated.caveats.link}` !== `${claimed.caveats.link}`
  ) {
    return new Failure(
      `Link ${
        claimed.caveats.link == null ? '' : `${claimed.caveats.link} `
      }violates imposed ${delegated.caveats.link} constraint`
    )
  } else {
    return true
  }
}

export const Add = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const Remove = capability({
  can: 'store/remove',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const List = capability({
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

export const Capability = Add.or(Remove).or(List)
