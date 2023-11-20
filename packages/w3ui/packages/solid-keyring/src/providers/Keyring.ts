import type { Context, ParentComponent } from 'solid-js'
import type {
  KeyringContextState,
  KeyringContextActions,
  ServiceConfig,
  CreateDelegationOptions,
  Abilities,
  Email,
  PlanGetResult,
  Client
} from '@w3ui/keyring-core'
import type { Delegation, Capability, DID, Principal, DIDKey } from '@ucanto/interface'

import {
  createContext,
  useContext,
  createSignal,
  createComponent
} from 'solid-js'
import { createStore } from 'solid-js/store'
import {
  createClient,
  getPlan as getPlanWithAgent,
  W3UI_ACCOUNT_LOCALSTORAGE_KEY,
  useAccount,
  login
} from '@w3ui/keyring-core'

export { KeyringContextState, KeyringContextActions }

export type KeyringContextValue = [
  state: KeyringContextState,
  actions: KeyringContextActions
]

const defaultState: KeyringContextState = {
  space: undefined,
  spaces: [],
  agent: undefined,
  client: undefined,
  account: window.localStorage.getItem(W3UI_ACCOUNT_LOCALSTORAGE_KEY) ?? undefined
}

export const AuthContext: Context<KeyringContextValue> = createContext<KeyringContextValue>([
  defaultState,
  {
    loadAgent: async () => {},
    unloadAgent: async () => {},
    resetAgent: async () => {},
    createSpace: async () => {
      throw new Error('missing keyring context provider')
    },
    setCurrentSpace: async () => {},
    registerSpace: async () => {},
    cancelAuthorize: () => {},
    getProofs: async () => [],
    createDelegation: async () => {
      throw new Error('missing keyring context provider')
    },
    addSpace: async () => {},
    authorize: async () => {},
    getPlan: async () => ({ error: { name: 'KeyringContextMissing', message: 'missing keyring context provider' } })
  }
])

export interface KeyringProviderProps extends ServiceConfig { }

/**
 * Key management provider.
 */
export const KeyringProvider: ParentComponent<KeyringProviderProps> = (
  props
) => {
  const [state, setState] = createStore({
    space: defaultState.space,
    spaces: defaultState.spaces,
    agent: defaultState.agent,
    client: defaultState.client,
    account: defaultState.account
  })

  const [client, setClient] = createSignal<Client>()
  const [registerAbortController, setRegisterAbortController] =
    createSignal<AbortController>()

  const getClient = async (): Promise<Client> => {
    let c = client()
    if (c == null) {
      c = await createClient({
        servicePrincipal: props.servicePrincipal,
        connection: props.connection
      })
      setClient(c)
      setState('client', c)
      setState('agent', c.agent.issuer)
      setState('space', c.currentSpace())
      setState('spaces', c.spaces())
    }
    return c
  }

  const authorize = async (email: `${string}@${string}`): Promise<void> => {
    const c = await getClient()
    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      await login(c, email)
      setState('account', email)
      window.localStorage.setItem(W3UI_ACCOUNT_LOCALSTORAGE_KEY, email)
      const newSpaces = c.spaces()
      setState('spaces', newSpaces)
      const newCurrentSpace = c.currentSpace() ?? newSpaces[0]
      if (newCurrentSpace != null) {
        await setCurrentSpace(newCurrentSpace.did() as DID<'key'>)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error
      }
    }
  }

  const cancelAuthorize = (): void => {
    const controller = registerAbortController()
    if (controller != null) {
      controller.abort()
    }
  }

  const createSpace = async (name?: string): Promise<DID> => {
    const c = await getClient()
    const space = await c.createSpace(name ?? 'Unnamed Space')
    const did = space.did()
    await c.setCurrentSpace(did)
    setState('space', c.currentSpace())
    return did
  }

  const registerSpace = async (email: string): Promise<void> => {
    const c = await getClient()
    const account = useAccount(c, { email })
    const space = c.currentSpace()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (account && space) {
      await account.provision(space.did() as DIDKey)
      setState('space', c.currentSpace())
      setState('spaces', c.spaces())
    }
  }

  const setCurrentSpace = async (did: DID): Promise<void> => {
    const c = await getClient()
    await c.setCurrentSpace(did as DID<'key'>)
    setState('space', c.currentSpace())
  }

  const loadAgent = async (): Promise<void> => {
    if (client() != null) return
    await getClient()
  }

  const unloadAgent = async (): Promise<void> => {
    setState('space', undefined)
    setState('spaces', [])
    setState('agent', undefined)
    setState('client', undefined)
    setState('account', undefined)
    setClient(undefined)
  }

  const resetAgent = async (): Promise<void> => {
    const c = await getClient()
    // @ts-expect-error store is there but the type doesn't expose it - TODO add store to Agent type
    await Promise.all([c.store.reset(), unloadAgent()])
  }

  const getProofs = async (caps: Capability[]): Promise<Delegation[]> => {
    const c = await getClient()
    return c.proofs(caps)
  }

  const getPlan = async (email: Email): Promise<PlanGetResult> => {
    const c = await getClient()
    return await getPlanWithAgent(c, email)
  }

  const createDelegation = async (
    audience: Principal,
    abilities: Abilities[],
    options: CreateDelegationOptions
  ): Promise<Delegation> => {
    const c = await getClient()
    const audienceMeta = options.audienceMeta ?? {
      name: 'agent',
      type: 'device'
    }
    return await c.agent.delegate({
      ...options,
      abilities,
      audience,
      audienceMeta
    })
  }

  const addSpace = async (proof: Delegation): Promise<void> => {
    const c = await getClient()
    await c.agent.importSpaceFromDelegation(proof)
  }

  const actions = {
    loadAgent,
    unloadAgent,
    resetAgent,
    createSpace,
    registerSpace,
    setCurrentSpace,
    getProofs,
    createDelegation,
    addSpace,
    authorize,
    cancelAuthorize,
    getPlan
  }

  return createComponent(AuthContext.Provider, {
    value: [state, actions],
    get children () {
      return props.children
    }
  })
}

/**
 * Use the scoped keyring context state from a parent KeyringProvider.
 */
export function useKeyring (): KeyringContextValue {
  return useContext(AuthContext)
}
