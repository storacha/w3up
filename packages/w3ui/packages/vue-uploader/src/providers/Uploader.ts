import { defineComponent, provide, InjectionKey, inject, Ref, shallowReactive, computed } from 'vue'
import { AuthProviderInjectionKey } from '@w3ui/vue-wallet'
import { uploadCarChunks, CarChunkMeta, CarData, encodeFile, chunkBlocks, encodeDirectory } from '@w3ui/uploader-core'
import { CID } from 'multiformats/cid'

/**
 * Injection keys for uploader context.
 */
export const UploaderProviderInjectionKey = {
  uploadFile: Symbol('w3ui uploader uploadFile') as InjectionKey<UploaderContextActions['uploadFile']>,
  uploadDirectory: Symbol('w3ui uploader uploadDirectory') as InjectionKey<UploaderContextActions['uploadDirectory']>,
  uploadCarChunks: Symbol('w3ui uploader uploadCarChunks') as InjectionKey<UploaderContextActions['uploadCarChunks']>,
  uploadedCarChunks: Symbol('w3ui uploader uploadedCarChunks') as InjectionKey<Ref<UploaderContextState['uploadedCarChunks']>>
}

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
  uploadCarChunks: (chunks: AsyncIterable<CarData>) => Promise<void>
}

/**
 * Provider for actions and state to facilitate uploads to the service.
 */
export const UploaderProvider = defineComponent({
  setup () {
    const identity = inject(AuthProviderInjectionKey.identity)
    const state = shallowReactive<UploaderContextState>({
      uploadedCarChunks: []
    })

    provide(UploaderProviderInjectionKey.uploadedCarChunks, computed(() => state.uploadedCarChunks))

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
        if (identity?.value == null) {
          throw new Error('missing identity')
        }
        state.uploadedCarChunks = []
        await uploadCarChunks(identity.value.signingPrincipal, chunks, {
          onChunkUploaded: e => {
            state.uploadedCarChunks = [...state.uploadedCarChunks, e.meta]
          }
        })
      }
    }

    provide(UploaderProviderInjectionKey.uploadFile, actions.uploadFile)
    provide(UploaderProviderInjectionKey.uploadDirectory, actions.uploadDirectory)
    provide(UploaderProviderInjectionKey.uploadCarChunks, actions.uploadCarChunks)

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
