import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react'
import { listUploads } from '@w3ui/uploads-list-core'
import { useAuth } from '@w3ui/react-wallet'
import { CID } from 'multiformats/cid'

export interface UploadsListContextValue {
  loading: boolean
  error?: Error
  data: CID[]
  reload: () => Promise<void>
}

const UploadsListContext = createContext<UploadsListContextValue>({
  loading: false,
  data: [],
  reload: async () => {}
})

export interface UploadsListProviderProps {
  children?: ReactNode
}

export function UploadsListProvider ({ children }: UploadsListProviderProps): ReactNode {
  const { identity } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [data, setData] = useState<CID[]>([])
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

export function useUploadsList (): UploadsListContextValue {
  return useContext(UploadsListContext)
}
