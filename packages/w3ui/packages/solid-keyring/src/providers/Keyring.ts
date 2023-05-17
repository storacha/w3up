import type { Context, ParentComponent } from 'solid-js'
import type {
  KeyringContextState,
  KeyringContextActions,
  ServiceConfig,
  CreateDelegationOptions,
  Agent,
  Abilities
} from '@w3ui/keyring-core'
import type { Delegation, Capability, DID, Principal } from '@ucanto/interface'

import {
  createContext,
  useContext,
  createSignal,
  createComponent
} from 'solid-js'
import { createStore } from 'solid-js/store'
import {
  authorize as accessAuthorize,
  createAgent,
  getCurrentSpace as getCurrentSpaceInAgent,
  getSpaces,
  W3UI_ACCOUNT_LOCALSTORAGE_KEY
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
    authorize: async () => {}
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
    account: defaultState.account
  })

  const [agent, setAgent] = createSignal<Agent>()
  const [registerAbortController, setRegisterAbortController] =
    createSignal<AbortController>()

  const getAgent = async (): Promise<Agent> => {
    let a = agent()
    if (a == null) {
      a = await createAgent({
        servicePrincipal: props.servicePrincipal,
        connection: props.connection
      })
      setAgent(a)
      setState('agent', a.issuer)
      setState('space', getCurrentSpaceInAgent(a))
      setState('spaces', getSpaces(a))
    }
    return a
  }

  const authorize = async (email: `${string}@${string}`): Promise<void> => {
    const agent = await getAgent()
    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      await accessAuthorize(agent, email, { signal: controller.signal })
      setState('account', email)
      window.localStorage.setItem(W3UI_ACCOUNT_LOCALSTORAGE_KEY, email)
      const newSpaces = getSpaces(agent)
      setState('spaces', newSpaces)
      const newCurrentSpace = getCurrentSpaceInAgent(agent) ?? newSpaces[0]
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
    const agent = await getAgent()
    const { did } = await agent.createSpace(name)
    await agent.setCurrentSpace(did)
    setState('space', getCurrentSpaceInAgent(agent))
    return did
  }

  const registerSpace = async (email: string): Promise<void> => {
    const agent = await getAgent()
    await agent.registerSpace(email)
    setState('space', getCurrentSpaceInAgent(agent))
    setState('spaces', getSpaces(agent))
  }

  const setCurrentSpace = async (did: DID): Promise<void> => {
    const agent = await getAgent()
    await agent.setCurrentSpace(did as DID<'key'>)
    setState('space', getCurrentSpaceInAgent(agent))
  }

  const loadAgent = async (): Promise<void> => {
    if (agent() != null) return
    await getAgent()
  }

  const unloadAgent = async (): Promise<void> => {
    setState('space', undefined)
    setState('spaces', [])
    setState('agent', undefined)
    setState('account', undefined)
    setAgent(undefined)
  }

  const resetAgent = async (): Promise<void> => {
    const agent = await getAgent()
    // @ts-expect-error TODO: expose store in access client
    await Promise.all([agent.store.reset(), unloadAgent()])
  }

  const getProofs = async (caps: Capability[]): Promise<Delegation[]> => {
    const agent = await getAgent()
    return agent.proofs(caps)
  }

  const createDelegation = async (
    audience: Principal,
    abilities: Abilities[],
    options: CreateDelegationOptions
  ): Promise<Delegation> => {
    const agent = await getAgent()
    const audienceMeta = options.audienceMeta ?? {
      name: 'agent',
      type: 'device'
    }
    return await agent.delegate({
      ...options,
      abilities,
      audience,
      audienceMeta
    })
  }

  const addSpace = async (proof: Delegation): Promise<void> => {
    const agent = await getAgent()
    await agent.importSpaceFromDelegation(proof)
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
    cancelAuthorize
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
