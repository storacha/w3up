import type {
  Link,
  Block,
  ServerView,
  ConnectionView,
  SigningAuthority,
  Audience,
  MalformedCapability,
  InvocationError,
  ServiceMethod,
  Capability,
  Ability,
  Caveats,
  Result,
  Resource,
  CapabilityMatch,
  Match,
  TheCapabilityParser,
  Await,
  URI,
  API,
  ParsedCapability,
  InferCaveats,
  Invocation,
} from '@ucanto/interface'
import { ProviderContext } from '@ucanto/server'

import * as Store from '../store/capability.js'

interface Method<
  I extends Capability = Capability,
  O extends unknown = unknown,
  X extends { error: true } = { error: true }
> extends ServiceMethod<I, O, X> {
  capability: I
  can: I['can']
}

interface Route<
  T extends ParsedCapability = ParsedCapability,
  O extends unknown = unknown,
  CTX extends {} = {}
> {
  capability: TheCapabilityParser<Match<T>>
  handler: CapabilityHandler<T, O, CTX>
}

interface CapabilityHandler<
  T extends ParsedCapability,
  O extends unknown = unknown,
  CTX extends {} = {}
> {
  (
    input: {
      capability: T
      invocation: Invocation<Capability<T['can'], T['with']> & T['caveats']>
    },
    context: CTX
  ): Await<O>
}

interface Service<T extends { [Can in string]: Route }> {
  routes: T

  provide<C extends ParsedCapability, O extends unknown, CTX extends {}>(
    capability: TheCapabilityParser<Match<C>>,
    handler: CapabilityHandler<C, O, CTX>
  ): Service<T & { [Can in C['can']]: Route<C, O, CTX> }>

  invoke<C extends ServiceCapability<T>>(
    capability: C,
    context: ServiceContext<T>
  ): ReturnType<T[C['can']]['handler']>

  capability: ServiceCapability<T>
  context: ServiceContext<T>
}

type ServiceCapability<T> = {
  [Can in keyof T]: T[Can] extends Route<infer C, any, any>
    ? Capability<C['can'], C['with']> & C['caveats']
    : never
}[keyof T]

type ServiceContext<T> = UnionToIntersection<
  {
    [Can in keyof T]: T[Can] extends Route<any, any, infer CTX> ? CTX : never
  }[keyof T]
>

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

interface Server<T extends { [key in string]: Method }> {
  internal: T

  provide: <
    A extends Ability,
    C extends Caveats,
    R extends URI,
    U extends unknown
  >(
    capability: TheCapabilityParser<CapabilityMatch<A, R, C>>,
    handler: (input: ProviderContext<A, R, C>) => Await<U>
  ) => Server<
    T & {
      [key in A]: Method<
        Capability<A, R['href']>,
        Exclude<U, { error: true }>,
        | (Exclude<U, Exclude<U, { error: true }>> & { error: true })
        | InvocationError
      >
    }
  >

  capability: InferCapability<T>

  invoke<C extends InferCapability<T>>(capbility: C): ReturnType<T[C['can']]>
}

type InferCapability<T> = {
  [Key in keyof T]: T[Key] extends Method<infer C, any, any> ? C : never
}[keyof T]

type MatchMetchod<T, C extends Capability> = {
  [Key in keyof T]: T[Key] extends Method<C, any, any> ? T[Key] : never
}[keyof T]

declare function service(): Service<{}>

const s = service()
  .provide(
    Store.Add,
    ({ capability, invocation }, context: { secret: Uint8Array }) => {
      return {
        status: 'done',
        with: capability.with,
        link: capability.caveats.link,
      }
    }
  )
  .provide(
    Store.Remove,
    ({ capability, invocation }, context: { name: string }) => {
      return null
    }
  )

const ctx = { ...s.context }
const routes = { ...s.routes }

const m = s.invoke(
  {
    can: 'store/add',
    with: 'did:key:zAlice',
  },
  { secret: new Uint8Array(), name: 'me' }
)
