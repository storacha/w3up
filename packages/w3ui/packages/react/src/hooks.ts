import type {
  Client,
  Space,
  Account,
  ServiceConfig
} from '@w3ui/core'

import { useState, useEffect, useCallback } from 'react'
import { STORE_SAVE_EVENT, createClient } from '@w3ui/core'

export type DatamodelProps = ServiceConfig

export interface Datamodel {
  client?: Client
  accounts: Account[]
  spaces: Space[]
  logout: () => Promise<void>
}

export function useDatamodel ({ servicePrincipal, connection }: DatamodelProps): Datamodel {
  const [client, setClient] = useState<Client>()
  const [events, setEvents] = useState<EventTarget>()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])

  // update this function any time servicePrincipal or connection change
  const setupClient = useCallback(
    async (): Promise<void> => {
      const { client, events } = await createClient({ servicePrincipal, connection })
      setClient(client)
      setEvents(events)
      setAccounts(Object.values(client.accounts()))
      setSpaces(client.spaces())
    },
    [servicePrincipal, connection]
  )

  // run setupClient once each time it changes
  useEffect(
    () => {
      void setupClient()
    },
    [setupClient]
  )

  // set up event listeners to refresh accounts and spaces when
  // the store:save event from @w3ui/core happens
  useEffect(() => {
    if ((client === undefined) || (events === undefined)) return

    const handleStoreSave: () => void = () => {
      setAccounts(Object.values(client.accounts()))
      setSpaces(client.spaces())
    }

    events.addEventListener(STORE_SAVE_EVENT, handleStoreSave)
    return () => {
      events?.removeEventListener(STORE_SAVE_EVENT, handleStoreSave)
    }
  }, [client, events])

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

  return { client, accounts, spaces, logout }
}
