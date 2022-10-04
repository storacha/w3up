import { createContext, useContext, createComponent, ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import { uploadCarChunks, CarChunkMeta, encodeFile, chunkBlocks, encodeDirectory } from '@w3ui/uploader-core'
import { useAuth } from '@w3ui/solid-wallet'
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
  uploadCarChunks: (chunks: AsyncIterable<AsyncIterable<Uint8Array>>) => Promise<void>
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

/**
 * Provider for actions and state to facilitate uploads to the service.
 */
export const UploaderProvider: ParentComponent = props => {
  const [auth] = useAuth()
  const [state, setState] = createStore<UploaderContextState>({ uploadedCarChunks: [] })

  const actions: UploaderContextActions = {
    async uploadFile (file: Blob) {
      const { cid, blocks } = encodeFile(file)
      await actions.uploadCarChunks(chunkBlocks(blocks))
      return await cid
    },
    async uploadDirectory (files: File[]) {
      const { cid, blocks } = encodeDirectory(files)
      await actions.uploadCarChunks(chunkBlocks(blocks))
      return await cid
    },
    async uploadCarChunks (chunks) {
      if (auth.identity == null) {
        throw new Error('missing identity')
      }

      setState('uploadedCarChunks', [])
      await uploadCarChunks(auth.identity.signingPrincipal, chunks, {
        onChunkUploaded: e => {
          setState('uploadedCarChunks', [...state.uploadedCarChunks, e.meta])
        }
      })
    }
  }

  return createComponent(UploaderContext.Provider, {
    value: [state, actions],
    get children () {
      return props.children
    }
  })
}

/**
 * Use the scoped uploader context state from a parent `UploaderProvider`.
 */
export function useUploader (): UploaderContextValue {
  return useContext(UploaderContext)
}
