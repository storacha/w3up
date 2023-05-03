import type {
  UploaderContextState,
  UploaderContextActions,
  CARMetadata,
  ProgressStatus,
  ServiceConfig
} from '@w3ui/uploader-core'
import {
  defineComponent,
  provide,
  InjectionKey,
  inject,
  Ref,
  shallowReactive,
  computed
} from 'vue'
import {
  uploadFile,
  uploadDirectory
} from '@w3ui/uploader-core'
import { KeyringProviderInjectionKey } from '@w3ui/vue-keyring'
import { add as storeAdd } from '@web3-storage/capabilities/store'
import { add as uploadAdd } from '@web3-storage/capabilities/upload'

interface UploaderProviderInjectionKeysType {
  uploadFile: InjectionKey<UploaderContextActions['uploadFile']>
  uploadDirectory: InjectionKey<UploaderContextActions['uploadDirectory']>
  storedDAGShards: InjectionKey<Ref<UploaderContextState['storedDAGShards']>>
  uploadProgress: InjectionKey<Ref<UploaderContextState['uploadProgress']>>
}

/**
 * Injection keys for uploader context.
 */
export const UploaderProviderInjectionKey: UploaderProviderInjectionKeysType = {
  uploadFile: Symbol('w3ui uploader uploadFile') as InjectionKey<UploaderContextActions['uploadFile']>,
  uploadDirectory: Symbol('w3ui uploader uploadDirectory') as InjectionKey<UploaderContextActions['uploadDirectory']>,
  storedDAGShards: Symbol('w3ui uploader storedDAGShards') as InjectionKey<Ref<UploaderContextState['storedDAGShards']>>,
  uploadProgress: Symbol('w3ui uploader uploadProgress') as InjectionKey<Ref<UploaderContextState['uploadProgress']>>
}

export interface UploaderProviderProps extends ServiceConfig {}

/**
 * Provider for actions and state to facilitate uploads to the service.
 */
export const UploaderProvider = defineComponent<UploaderProviderProps>({
  setup ({ servicePrincipal, connection }) {
    const space = inject(KeyringProviderInjectionKey.space)
    const agent = inject(KeyringProviderInjectionKey.agent)
    const getProofs = inject(KeyringProviderInjectionKey.getProofs)

    const state = shallowReactive<UploaderContextState>({
      storedDAGShards: [],
      uploadProgress: {}
    })

    provide(
      UploaderProviderInjectionKey.storedDAGShards,
      computed(() => state.storedDAGShards)
    )

    provide(
      UploaderProviderInjectionKey.uploadProgress,
      computed(() => state.uploadProgress)
    )

    const actions: UploaderContextActions = {
      async uploadFile (file: Blob) {
        if (space?.value == null) throw new Error('missing space')
        if (agent?.value == null) throw new Error('missing agent')
        if (getProofs == null) throw new Error('missing getProofs')

        const storedShards: CARMetadata[] = []
        state.storedDAGShards = storedShards

        const conf = {
          issuer: agent.value,
          with: space.value.did(),
          audience: servicePrincipal,
          proofs: await getProofs([
            { can: storeAdd.can, with: space.value.did() },
            { can: uploadAdd.can, with: space.value.did() }
          ])
        }

        const result = await uploadFile(conf, file, {
          onShardStored: (meta) => {
            storedShards.push(meta)
            state.storedDAGShards = [...storedShards]
          },
          onUploadProgress: (status: ProgressStatus) => {
            state.uploadProgress = { ...state.uploadProgress, [status.url ?? '']: status }
          },
          connection
        })
        state.uploadProgress = {}
        return result
      },
      async uploadDirectory (files: File[]) {
        if (space?.value == null) throw new Error('missing space')
        if (agent?.value == null) throw new Error('missing agent')
        if (getProofs == null) throw new Error('missing getProofs')

        const storedShards: CARMetadata[] = []
        state.storedDAGShards = storedShards

        const conf = {
          issuer: agent.value,
          with: space.value.did(),
          audience: servicePrincipal,
          proofs: await getProofs([
            { can: storeAdd.can, with: space.value.did() },
            { can: uploadAdd.can, with: space.value.did() }
          ])
        }

        const result = await uploadDirectory(conf, files, {
          onShardStored: (meta) => {
            storedShards.push(meta)
            state.storedDAGShards = [...storedShards]
          },
          onUploadProgress: (status: ProgressStatus) => {
            state.uploadProgress = { ...state.uploadProgress, [status.url ?? '']: status }
          },
          connection
        })
        state.uploadProgress = {}
        return result
      }
    }

    provide(UploaderProviderInjectionKey.uploadFile, actions.uploadFile)
    provide(
      UploaderProviderInjectionKey.uploadDirectory,
      actions.uploadDirectory
    )

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    return this.$slots.default?.()
  }
})
