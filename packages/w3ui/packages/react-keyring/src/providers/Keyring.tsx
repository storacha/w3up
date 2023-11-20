import type {
  Abilities,
  Client,
  KeyringContextState,
  KeyringContextActions,
  Email,
  Plan,
  PlanGetResult,
  ServiceConfig,
  Space
} from '@w3ui/keyring-core'
import type {
  Capability,
  Delegation,
  DID,
  DIDKey,
  Principal,
  Proof,
  Signer
} from '@ucanto/interface'

import React, { createContext, useState, useContext } from 'react'
import useLocalStorageState from 'use-local-storage-state'
import {
  getPlan as getPlanWithClient,
  CreateDelegationOptions,
  W3UI_ACCOUNT_LOCALSTORAGE_KEY,
  createClient,
  useAccount,
  login
} from '@w3ui/keyring-core'

export { Plan, KeyringContextState, KeyringContextActions }

export type KeyringContextValue = [
  state: KeyringContextState,
  actions: KeyringContextActions
]

export const keyringContextDefaultValue: KeyringContextValue = [
  {
    space: undefined,
    spaces: [],
    agent: undefined,
    client: undefined,
    account: undefined
  },
  {
    loadAgent: async () => {},
    unloadAgent: async () => {},
    resetAgent: async () => {},
    authorize: async () => {},
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
    getPlan: async () => ({ error: { name: 'KeyringContextMissing', message: 'missing keyring context provider' } })
  }
]

export const KeyringContext = createContext<KeyringContextValue>(
  keyringContextDefaultValue
)

export interface KeyringProviderProps extends ServiceConfig {
  children?: JSX.Element
}

/**
 * Key management provider.
 */
export function KeyringProvider ({
  children,
  servicePrincipal,
  connection
}: KeyringProviderProps): JSX.Element {
  const [client, setClient] = useState<Client>()
  const [agent, setAgent] = useState<Signer>()
  const [account, setAccount, { removeItem: unsetAccount }] = useLocalStorageState<string>(W3UI_ACCOUNT_LOCALSTORAGE_KEY)
  const [space, setSpace] = useState<Space>()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [registerAbortController, setRegisterAbortController] =
    useState<AbortController>()

  const getClient = async (): Promise<Client> => {
    if (client == null) {
      const client = await createClient({ servicePrincipal, connection })
      setClient(client)
      setAgent(client.agent.issuer)
      setSpace(client.currentSpace())
      setSpaces(client.spaces())
      return client
    }
    return client
  }

  const authorize = async (email: `${string}@${string}`): Promise<void> => {
    const c = await getClient()
    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      await login(c, email)
      setAccount(email)
      const newSpaces = c.spaces()
      setSpaces(newSpaces)
      const newCurrentSpace = c.currentSpace()
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
    if (registerAbortController != null) {
      registerAbortController.abort()
    }
  }

  const createSpace = async (name?: string): Promise<DID> => {
    const c = await getClient()
    const space = await c.createSpace(name ?? 'Unnamed Space')
    const did = space.did()
    await c.setCurrentSpace(did)
    setSpace(c.currentSpace())
    return did
  }

  const registerSpace = async (email: string): Promise<void> => {
    const c = await getClient()
    const account = useAccount(c, { email })
    const space = c.currentSpace()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (account && space) {
      await account.provision(space.did() as DIDKey)
      setSpace(c.currentSpace())
      setSpaces(c.spaces())
    }
  }

  const setCurrentSpace = async (did: DID): Promise<void> => {
    const c = await getClient()
    await c.setCurrentSpace(did as DID<'key'>)
    setSpace(c.currentSpace())
  }

  const loadAgent = async (): Promise<void> => {
    if (client != null) return
    await getClient()
  }

  const unloadAgent = async (): Promise<void> => {
    setSpace(undefined)
    setSpaces([])
    setClient(undefined)
    unsetAccount()
  }

  const resetAgent = async (): Promise<void> => {
    const c = await getClient()
    // @ts-expect-error store is there but the type doesn't expose it - TODO add store to Agent type
    await Promise.all([c.agent.store.reset(), unloadAgent()])
  }

  const getProofs = async (caps: Capability[]): Promise<Proof[]> => {
    const c = await getClient()
    return c.agent.proofs(caps)
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

  const getPlan = async (email: Email): Promise<PlanGetResult> => {
    const c = await getClient()
    return await getPlanWithClient(c, email)
  }

  const state = {
    space,
    spaces,
    agent,
    client,
    account
  }
  const actions = {
    authorize,
    cancelAuthorize,
    loadAgent,
    unloadAgent,
    resetAgent,
    createSpace,
    registerSpace,
    setCurrentSpace,
    getProofs,
    createDelegation,
    addSpace,
    getPlan
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
