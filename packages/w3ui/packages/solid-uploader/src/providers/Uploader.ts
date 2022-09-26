import { createContext, useContext, createComponent, ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import { encodeFile, encodeDirectory, uploadCarBytes, EncodeResult } from '@w3ui/uploader-core'
import { useAuth } from '@w3ui/solid-wallet'

export type UploaderContextValue = [
  state: {},
  actions: {
    /**
     * Create a UnixFS DAG from the passed file data and serialize to a CAR file.
     */
    encodeFile: (data: Blob) => Promise<EncodeResult>
    /**
     * Create a UnixFS DAG from the passed file data and serialize to a CAR file.
     * All files are added to a container directory, with paths in file names
     * preserved.
     */
    encodeDirectory: (files: Iterable<File>) => Promise<EncodeResult>
    /**
     * Upload CAR bytes to the service.
     */
    uploadCar: (car: AsyncIterable<Uint8Array>) => Promise<void>
  }
]

const defaultState = {}

const UploaderContext = createContext<UploaderContextValue>([defaultState, {
  encodeFile: async () => { throw new Error('missing uploader context provider') },
  encodeDirectory: async () => { throw new Error('missing uploader context provider') },
  uploadCar: async () => { throw new Error('missing uploader context provider') }
}])

export const UploaderProvider: ParentComponent = props => {
  const [auth] = useAuth()
  const [state] = createStore({ ...defaultState })

  const actions = {
    encodeFile,
    encodeDirectory,
    async uploadCar (car: AsyncIterable<Uint8Array>) {
      if (auth.identity == null) {
        throw new Error('missing identity')
      }
      const chunks: Uint8Array[] = []
      for await (const chunk of car) {
        chunks.push(chunk)
      }
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer())
      await uploadCarBytes(auth.identity.signingPrincipal, bytes)
    }
  }

  return createComponent(UploaderContext.Provider, {
    value: [state, actions],
    get children () {
      return props.children
    }
  })
}

export function useUploader (): UploaderContextValue {
  return useContext(UploaderContext)
}
