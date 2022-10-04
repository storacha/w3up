import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react'
import { listUploads, ListPage } from '@w3ui/uploads-list-core'
import { useAuth } from '@w3ui/react-wallet'

export interface UploadsListContextValue {
  /**
   * True if the uploads list is currently being retrieved from the service.
   */
  loading: boolean
  /**
   * Set if an error occurred retrieving the uploads list.
   */
  error?: Error
  /**
   * The content of the uploads list.
   */
  data?: ListPage
  /**
   * Call to reload the uploads list.
   */
  reload: () => Promise<void>
}

const UploadsListContext = createContext<UploadsListContextValue>({
  loading: false,
  reload: async () => {}
})

export interface UploadsListProviderProps {
  children?: ReactNode
}

/**
 * Provider for a list of items uploaded by the current identity.
 */
export function UploadsListProvider ({ children }: UploadsListProviderProps): ReactNode {
  const { identity } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [data, setData] = useState<ListPage>()
  const [controller, setController] = useState(new AbortController())

  const reload = async (): Promise<void> => {
    if (identity == null) return
    controller.abort()
    const newController = new AbortController()
    setController(newController)
    setLoading(true)
    try {
      setData(await listUploads(identity.signingPrincipal, { signal: newController.signal }))
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err)
        // @ts-expect-error ts not know about cause
        setError(new Error('failed to fetch uploads list', { cause: err }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [identity])

  return (
    <UploadsListContext.Provider value={{ error, loading, data, reload }}>
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
