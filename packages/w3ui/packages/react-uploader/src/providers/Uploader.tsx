import React, { useContext, createContext, useState, ReactNode } from 'react'
import { encodeFile, encodeDirectory, chunkBlocks, uploadCarChunks, CarChunkMeta, CarData, createUpload } from '@w3ui/uploader-core'
import { useAuth } from '@w3ui/react-keyring'
import { CID } from 'multiformats/cid'

export interface UploaderContextState {
  uploadedCarChunks: CarChunkMeta[]
}

export interface UploaderContextActions {
  /**
   * Upload a single file to the service.
   */
  uploadFile: (file: Blob) => Promise<CID>
  /**
   * Upload a directory of files to the service.
   */
  uploadDirectory: (files: File[]) => Promise<CID>
  /**
   * Upload CAR bytes to the service.
   */
  uploadCarChunks: (chunks: AsyncIterable<CarData>) => Promise<CID[]>
}

export type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]

const UploaderContext = createContext<UploaderContextValue>([
  { uploadedCarChunks: [] },
  {
    uploadFile: async () => { throw new Error('missing uploader context provider') },
    uploadDirectory: async () => { throw new Error('missing uploader context provider') },
    uploadCarChunks: async () => { throw new Error('missing uploader context provider') }
  }
])

export interface UploaderProviderProps {
  children?: ReactNode
}

/**
 * Provider for actions and state to facilitate uploads to the service.
 */
export function UploaderProvider ({ children }: UploaderProviderProps): ReactNode {
  const { identity } = useAuth()
  const [uploadedCarChunks, setUploadedCarChunks] = useState<UploaderContextState['uploadedCarChunks']>([])

  const state = { uploadedCarChunks }
  const actions: UploaderContextActions = {
    async uploadFile (file: Blob) {
      if (identity == null) throw new Error('missing identity')

      const { cid: cidPromise, blocks } = encodeFile(file)
      const carCids = await actions.uploadCarChunks(chunkBlocks(blocks))

      const cid = await cidPromise
      await createUpload(identity.signingPrincipal, cid, carCids)
      return cid
    },
    async uploadDirectory (files: File[]) {
      if (identity == null) throw new Error('missing identity')

      const { cid: cidPromise, blocks } = encodeDirectory(files)
      const carCids = await actions.uploadCarChunks(chunkBlocks(blocks))

      const cid = await cidPromise
      await createUpload(identity.signingPrincipal, cid, carCids)
      return cid
    },
    async uploadCarChunks (chunks) {
      if (identity == null) throw new Error('missing identity')

      const uploadedChunks: CarChunkMeta[] = []
      setUploadedCarChunks(uploadedChunks)

      return await uploadCarChunks(identity.signingPrincipal, chunks, {
        onChunkUploaded: e => {
          uploadedChunks.push(e.meta)
          setUploadedCarChunks([...uploadedChunks])
        }
      })
    }
  }

  return (
    <UploaderContext.Provider value={[state, actions]}>
      {children}
    </UploaderContext.Provider>
  )
}

/**
 * Use the scoped uploader context state from a parent `UploaderProvider`.
 */
export function useUploader (): UploaderContextValue {
  return useContext(UploaderContext)
}
