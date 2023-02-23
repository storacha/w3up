import React, { useContext, createContext, useState, useEffect } from 'react'
import {
  UploadListResult,
  UploadsListContextState,
  UploadsListContextActions,
  ServiceConfig,
  list
} from '@w3ui/uploads-list-core'
import { useKeyring } from '@w3ui/react-keyring'
import { list as uploadList } from '@web3-storage/capabilities/upload'

export type UploadsListContextValue = [
  state: UploadsListContextState,
  actions: UploadsListContextActions
]

export const uploadsListContextDefaultValue: UploadsListContextValue = [
  {
    loading: false
  },
  {
    prev: async () => {},
    next: async () => {},
    reload: async () => {}
  }
]

export const UploadsListContext = createContext<UploadsListContextValue>(
  uploadsListContextDefaultValue
)

export interface UploadsListProviderProps extends ServiceConfig {
  children?: JSX.Element
  /**
   * Maximum number of items to return per page.
   */
  size?: number
}

/**
 * Provider for a list of items uploaded to the current space.
 */
export function UploadsListProvider ({
  size,
  servicePrincipal,
  connection,
  children
}: UploadsListProviderProps): JSX.Element {
  const [{ space, agent }, { getProofs }] = useKeyring()
  const [before, setBefore] = useState<string>()
  const [after, setAfter] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [data, setData] = useState<UploadListResult[]>()
  const [controller, setController] = useState(new AbortController())

  const loadPage = async (cursor?: string, pre?: boolean): Promise<void> => {
    if (space == null) return
    if (agent == null) return

    controller.abort()
    const newController = new AbortController()
    setController(newController)
    setLoading(true)

    try {
      const conf = {
        issuer: agent,
        with: space.did(),
        audience: servicePrincipal,
        proofs: await getProofs([{ can: uploadList.can, with: space.did() }])
      }
      const page = await list(conf, {
        cursor,
        size,
        pre,
        signal: newController.signal,
        connection
      })
      if (page.size > 0) {
        setBefore(page.before)
        setAfter(page.after)
        setData(page.results)
      }
    } catch (error_: any) {
      if (error_.name !== 'AbortError') {
        /* eslint-disable no-console */
        console.error(error_)
        /* eslint-enable no-console */
        setError(new Error('failed to fetch uploads list', { cause: error_ }))
      }
    } finally {
      setLoading(false)
    }
  }

  const state = { data, loading, error }
  const actions = {
    next: async (): Promise<void> => { await loadPage(after) },
    prev: async (): Promise<void> => { await loadPage(before, true) },
    reload: async (): Promise<void> => {
      setBefore(undefined)
      setAfter(undefined)
      await loadPage()
    }
  }

  // we should reload the page any time the space or agent change
  useEffect(() => {
    setBefore(undefined)
    setAfter(undefined)
    setData([])
    void loadPage()
  }, [space, agent])

  return (
    <UploadsListContext.Provider value={[state, actions]}>
      {children}
    </UploadsListContext.Provider>
  )
}

/**
 * Use the scoped uploads list context state from a parent `UploadsListProvider`.
 */
export function useUploadsList (): UploadsListContextValue {
  return useContext(UploadsListContext)
}
