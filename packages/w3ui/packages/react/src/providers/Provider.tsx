import type {
  Client,
  ContextState,
  ContextActions,
  ServiceConfig,
  Space,
  Account
} from '@w3ui/core'

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react'
import { createClient } from '@w3ui/core'

export { ContextState, ContextActions }

export type ContextValue = [
  state: ContextState,
  actions: ContextActions
]

export const ContextDefaultValue: ContextValue = [
  {
    client: undefined,
    accounts: [],
    spaces: []
  },
  {
    logout: async () => {
      throw new Error('missing logout function')
    }
  }
]

export const Context = createContext<ContextValue>(
  ContextDefaultValue
)

export interface ProviderProps extends ServiceConfig {
  children?: ReactNode
}

/**
 * W3UI provider.
 */
export function Provider ({
  children,
  servicePrincipal,
  connection
}: ProviderProps): ReactNode {
  const [client, setClient] = useState<Client>()
  const [events, setEvents] = useState<EventTarget>()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])

  useEffect(() => {
    if ((client === undefined) || (events === undefined)) return

    const handleStoreSave: () => void = () => {
      setAccounts(Object.values(client.accounts()))
      setSpaces(client.spaces())
    }

    events.addEventListener('store:save', handleStoreSave)
    return () => {
      events?.removeEventListener('store:save', handleStoreSave)
    }
  }, [client, events])

  const setupClient = async (): Promise<void> => {
    const { client, events } = await createClient({ servicePrincipal, connection })
    setClient(client)
    setEvents(events)
    setAccounts(Object.values(client.accounts()))
    setSpaces(client.spaces())
  }

  const logout = async (): Promise<void> => {
    // it's possible that setupClient hasn't been run yet - run createClient here
    // to get a reliable handle on the latest store
    const { store } = await createClient({ servicePrincipal, connection })
    await store.reset()
    // set state back to defaults
    setClient(undefined)
    setEvents(undefined)
    setAccounts([])
    setSpaces([])
    // set state up again
    await setupClient()
  }

  useEffect(() => { void setupClient() }, []) // load client - once.

  return (
    <Context.Provider value={[{ client, accounts, spaces }, { logout }]}>
      {children}
    </Context.Provider>
  )
}

/**
 * Use the scoped core context state from a parent Provider.
 */
export function useW3 (): ContextValue {
  return useContext(Context)
}
