import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react'
import { encodeFile, encodeDirectory, uploadCarBytes, EncodeResult } from '@w3ui/uploader-core'
import { useAuth } from '@w3ui/react-wallet'

export interface Uploader {
  encodeFile: (data: Blob) => Promise<EncodeResult>
  encodeDirectory: (files: Iterable<File>) => Promise<EncodeResult>
  uploadCar: (car: AsyncIterable<Uint8Array>) => Promise<void>
}

export interface UploaderContextValue {
  uploader?: Uploader
}

const UploaderContext = createContext<UploaderContextValue>({})

export interface UploaderProviderProps {
  children?: ReactNode
}

export function UploaderProvider ({ children }: UploaderProviderProps): ReactNode {
  const { identity } = useAuth()
  const [uploader, setUploader] = useState<Uploader|undefined>(undefined)

  useEffect(() => {
    if (identity != null) {
      setUploader({
        encodeFile,
        encodeDirectory,
        async uploadCar (car: AsyncIterable<Uint8Array>) {
          const chunks: Uint8Array[] = []
          for await (const chunk of car) {
            chunks.push(chunk)
          }
          const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer())
          await uploadCarBytes(identity.signingAuthority, bytes)
        }
      })
    }
  }, [identity])

  return (
    <UploaderContext.Provider value={{ uploader }}>
      {children}
    </UploaderContext.Provider>
  )
}

export function useUploader (): UploaderContextValue {
  return useContext(UploaderContext)
}
