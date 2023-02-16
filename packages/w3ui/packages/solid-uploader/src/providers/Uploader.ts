import type {
  UploaderContextState,
  UploaderContextActions,
  CARMetadata,
  ServiceConfig
} from '@w3ui/uploader-core'

import {
  createContext,
  useContext,
  createComponent,
  ParentComponent
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { uploadFile, uploadDirectory } from '@w3ui/uploader-core'
import { useKeyring } from '@w3ui/solid-keyring'
import { add as storeAdd } from '@web3-storage/capabilities/store'
import { add as uploadAdd } from '@web3-storage/capabilities/upload'

export type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]

const UploaderContext = createContext<UploaderContextValue>([
  { storedDAGShards: [] },
  {
    uploadFile: async () => {
      throw new Error('missing uploader context provider')
    },
    uploadDirectory: async () => {
      throw new Error('missing uploader context provider')
    }
  }
])

export interface UploaderProviderProps extends ServiceConfig {}

/**
 * Provider for actions and state to facilitate uploads to the service.
 */
export const UploaderProvider: ParentComponent<UploaderProviderProps> = (
  props
) => {
  const [keyringState, keyringActions] = useKeyring()
  const [state, setState] = createStore<UploaderContextState>({
    storedDAGShards: []
  })

  const actions: UploaderContextActions = {
    async uploadFile (file: Blob) {
      if (keyringState.space == null) throw new Error('missing space')
      if (keyringState.agent == null) throw new Error('missing agent')

      const storedShards: CARMetadata[] = []
      setState('storedDAGShards', storedShards)

      const conf = {
        issuer: keyringState.agent,
        with: keyringState.space.did(),
        audience: props.servicePrincipal,
        proofs: await keyringActions.getProofs([
          { can: storeAdd.can, with: keyringState.space.did() },
          { can: uploadAdd.can, with: keyringState.space.did() }
        ])
      }

      return await uploadFile(conf, file, {
        onShardStored: (meta) => {
          storedShards.push(meta)
          setState('storedDAGShards', [...storedShards])
        },
        connection: props.connection
      })
    },
    async uploadDirectory (files: File[]) {
      if (keyringState.space == null) throw new Error('missing space')
      if (keyringState.agent == null) throw new Error('missing agent')

      const storedShards: CARMetadata[] = []
      setState('storedDAGShards', storedShards)

      const conf = {
        issuer: keyringState.agent,
        with: keyringState.space.did(),
        audience: props.servicePrincipal,
        proofs: await keyringActions.getProofs([
          { can: storeAdd.can, with: keyringState.space.did() },
          { can: uploadAdd.can, with: keyringState.space.did() }
        ]),
        connection: props.connection
      }

      return await uploadDirectory(conf, files, {
        onShardStored: (meta) => {
          storedShards.push(meta)
          setState('storedDAGShards', [...storedShards])
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
