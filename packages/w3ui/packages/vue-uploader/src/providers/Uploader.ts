import { defineComponent, provide, InjectionKey, inject } from 'vue'
import { AuthProviderInjectionKey } from '@w3ui/vue-wallet'
import { encodeFile, encodeDirectory, uploadCarBytes, EncodeResult } from '@w3ui/uploader-core'

/**
 * Injection keys for uploader context.
 */
export const UploaderProviderInjectionKey = {
  encodeFile: Symbol('w3ui uploader encodeFile') as InjectionKey<UploaderContextActions['encodeFile']>,
  encodeDirectory: Symbol('w3ui uploader encodeDirectory') as InjectionKey<UploaderContextActions['encodeDirectory']>,
  uploadCar: Symbol('w3ui uploader uploadCar') as InjectionKey<UploaderContextActions['uploadCar']>
}

export interface UploaderContextActions {
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

export const UploaderProvider = defineComponent({
  setup () {
    const identity = inject(AuthProviderInjectionKey.identity)

    provide(UploaderProviderInjectionKey.encodeFile, encodeFile)
    provide(UploaderProviderInjectionKey.encodeDirectory, encodeDirectory)
    provide(UploaderProviderInjectionKey.uploadCar, async car => {
      if (identity?.value == null) {
        throw new Error('missing identity')
      }
      const chunks: Uint8Array[] = []
      for await (const chunk of car) {
        chunks.push(chunk)
      }
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer())
      await uploadCarBytes(identity.value.signingPrincipal, bytes)
    })
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
