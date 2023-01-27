import type { ParentComponent } from 'solid-js'
import type { KeyringContextState, KeyringContextActions, ServiceConfig, CreateDelegationOptions } from '@w3ui/keyring-core'
import type { Agent } from '@web3-storage/access'
import type { Abilities } from '@web3-storage/access/types'
import type { Delegation, Capability, DID, Principal } from '@ucanto/interface'

import { createContext, useContext, createSignal, createComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import { createAgent, getCurrentSpace, getSpaces } from '@w3ui/keyring-core'

export { KeyringContextState, KeyringContextActions }

export type KeyringContextValue = [
  state: KeyringContextState,
  actions: KeyringContextActions
]

const defaultState: KeyringContextState = {
  space: undefined,
  spaces: [],
  agent: undefined
}

export const AuthContext = createContext<KeyringContextValue>([
  defaultState,
  {
    loadAgent: async () => { },
    unloadAgent: async () => { },
    resetAgent: async () => { },
    createSpace: async () => { throw new Error('missing keyring context provider') },
    setCurrentSpace: async () => { },
    registerSpace: async () => { },
    cancelRegisterSpace: () => { },
    getProofs: async () => [],
    createDelegation: async () => { throw new Error('missing keyring context provider') }
  }
])

export interface KeyringProviderProps extends ServiceConfig { }

/**
 * Key management provider.
 */
export const KeyringProvider: ParentComponent<KeyringProviderProps> = props => {
  const [state, setState] = createStore({
    space: defaultState.space,
    spaces: defaultState.spaces,
    agent: defaultState.agent
  })

  const [agent, setAgent] = createSignal<Agent>()
  const [registerAbortController, setRegisterAbortController] = createSignal<AbortController>()

  const getAgent = async (): Promise<Agent> => {
    let a = agent()
    if (a == null) {
      a = await createAgent({ servicePrincipal: props.servicePrincipal, connection: props.connection })
      setAgent(a)
      setState('agent', a.issuer)
      setState('space', getCurrentSpace(a))
      setState('spaces', getSpaces(a))
    }
    return a
  }

  const cancelRegisterSpace = (): void => {
    const controller = registerAbortController()
    if (controller != null) {
      controller.abort()
    }
  }

  const createSpace = async (name?: string): Promise<DID> => {
    const agent = await getAgent()
    const { did } = await agent.createSpace(name)
    await agent.setCurrentSpace(did)
    setState('space', getCurrentSpace(agent))
    return did
  }

  const registerSpace = async (email: string): Promise<void> => {
    const agent = await getAgent()
    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      await agent.registerSpace(email, { signal: controller.signal })
      setState('space', getCurrentSpace(agent))
      setState('spaces', getSpaces(agent))
    } catch (err) {
      if (!controller.signal.aborted) {
        throw err
      }
    }
  }

  const setCurrentSpace = async (did: DID): Promise<void> => {
    const agent = await getAgent()
    await agent.setCurrentSpace(did)
    setState('space', getCurrentSpace(agent))
  }

  const loadAgent = async (): Promise<void> => {
    if (agent() != null) return
    await getAgent()
  }

  const unloadAgent = async (): Promise<void> => {
    setState('space', undefined)
    setState('spaces', [])
    setState('agent', undefined)
    setAgent(undefined)
  }

  const resetAgent = async (): Promise<void> => {
    const agent = await getAgent()
    // @ts-expect-error
    await Promise.all([agent.store.reset(), unloadAgent()])
  }

  const getProofs = async (caps: Capability[]): Promise<Delegation[]> => {
    const agent = await getAgent()
    return agent.proofs(caps)
  }

  const createDelegation = async (audience: Principal, abilities: Abilities[], options: CreateDelegationOptions): Promise<Delegation> => {
    const agent = await getAgent()
    const audienceMeta = options.audienceMeta ?? { name: 'agent', type: 'device' }
    return await agent.delegate({
      ...options,
      abilities,
      audience,
      audienceMeta
    })
  }

  const actions = {
    loadAgent,
    unloadAgent,
    resetAgent,
    createSpace,
    registerSpace,
    cancelRegisterSpace,
    setCurrentSpace,
    getProofs,
    createDelegation
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
