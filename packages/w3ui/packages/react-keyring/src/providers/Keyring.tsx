import React, { createContext, useState, useContext } from 'react'
import { createAgent, Space, getCurrentSpace, getSpaces } from '@w3ui/keyring-core'
import type { KeyringContextState, KeyringContextActions, ServiceConfig } from '@w3ui/keyring-core'
import type { Agent } from '@web3-storage/access'
import type { Capability, DID, Proof, Signer } from '@ucanto/interface'

export { KeyringContextState, KeyringContextActions }

export type KeyringContextValue = [
  state: KeyringContextState,
  actions: KeyringContextActions
]

export const keyringContextDefaultValue: KeyringContextValue = [
  {
    space: undefined,
    spaces: [],
    agent: undefined
  },
  {
    loadAgent: async () => { },
    unloadAgent: async () => { },
    resetAgent: async () => { },
    createSpace: async () => { throw new Error('missing keyring context provider') },
    setCurrentSpace: async () => { },
    registerSpace: async () => { },
    cancelRegisterSpace: () => { },
    getProofs: async () => []
  }
]

export const KeyringContext = createContext<KeyringContextValue>(keyringContextDefaultValue)

export interface KeyringProviderProps extends ServiceConfig {
  children?: JSX.Element
}

/**
 * Key management provider.
 */
export function KeyringProvider ({ children, servicePrincipal, connection }: KeyringProviderProps): JSX.Element {
  const [agent, setAgent] = useState<Agent>()
  const [space, setSpace] = useState<Space>()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [issuer, setIssuer] = useState<Signer>()
  const [registerAbortController, setRegisterAbortController] = useState<AbortController>()

  const getAgent = async (): Promise<Agent> => {
    if (agent == null) {
      const a = await createAgent({ servicePrincipal, connection })
      setAgent(a)
      setIssuer(a.issuer)
      setSpace(getCurrentSpace(a))
      setSpaces(getSpaces(a))
      return a
    }
    return agent
  }

  const cancelRegisterSpace = (): void => {
    if (registerAbortController != null) {
      registerAbortController.abort()
    }
  }

  const createSpace = async (name?: string): Promise<DID> => {
    const agent = await getAgent()
    const { did } = await agent.createSpace(name)
    await agent.setCurrentSpace(did)
    setSpace(getCurrentSpace(agent))
    return did
  }

  const registerSpace = async (email: string): Promise<void> => {
    const agent = await getAgent()
    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      await agent.registerSpace(email, { signal: controller.signal })
      setSpace(getCurrentSpace(agent))
      setSpaces(getSpaces(agent))
    } catch (err) {
      if (!controller.signal.aborted) {
        throw err
      }
    }
  }

  const setCurrentSpace = async (did: DID): Promise<void> => {
    const agent = await getAgent()
    await agent.setCurrentSpace(did)
    setSpace(getCurrentSpace(agent))
  }

  const loadAgent = async (): Promise<void> => {
    if (agent != null) return
    await getAgent()
  }

  const unloadAgent = async (): Promise<void> => {
    setSpace(undefined)
    setSpaces([])
    setIssuer(undefined)
    setAgent(undefined)
  }

  const resetAgent = async (): Promise<void> => {
    const agent = await getAgent()
    // @ts-expect-error
    await Promise.all([agent.store.reset(), unloadAgent()])
  }

  const getProofs = async (caps: Capability[]): Promise<Proof[]> => {
    const agent = await getAgent()
    return agent.proofs(caps)
  }

  const state = {
    space,
    spaces,
    agent: issuer
  }
  const actions = {
    loadAgent,
    unloadAgent,
    resetAgent,
    createSpace,
    registerSpace,
    cancelRegisterSpace,
    setCurrentSpace,
    getProofs
  }

  return (
    <KeyringContext.Provider value={[state, actions]}>
      {children}
    </KeyringContext.Provider>
  )
}

/**
 * Use the scoped keyring context state from a parent KeyringProvider.
 */
export function useKeyring (): KeyringContextValue {
  return useContext(KeyringContext)
}
