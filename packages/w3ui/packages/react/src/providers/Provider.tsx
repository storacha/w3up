import type {
  Client,
  ContextState,
  ContextActions,
  ServiceConfig,
  Space,
  Account
} from '@w3ui/core'

import React, { createContext, useState, useContext, useEffect } from 'react'
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
  {}
]

export const Context = createContext<ContextValue>(
  ContextDefaultValue
)

export interface ProviderProps extends ServiceConfig {
  children?: JSX.Element
}

/**
 * W3UI provider.
 */
export function Provider ({
  children,
  servicePrincipal,
  connection
}: ProviderProps): JSX.Element {
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

  const getClient = async (): Promise<Client> => {
    if (client == null) {
      const { client, events } = await createClient({ servicePrincipal, connection })
      setClient(client)
      setEvents(events)
      setAccounts(Object.values(client.accounts()))
      setSpaces(client.spaces())
      return client
    }
    return client
  }

  useEffect(() => { void getClient() }, []) // load client - once.

  return (
    <Context.Provider value={[{ client, accounts, spaces }, {}]}>
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
