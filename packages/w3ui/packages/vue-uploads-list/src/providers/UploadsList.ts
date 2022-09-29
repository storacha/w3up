import { defineComponent, provide, InjectionKey, inject, shallowReactive, Ref, computed, watch } from 'vue'
import { AuthProviderInjectionKey } from '@w3ui/vue-wallet'
import { listUploads, ListPage } from '@w3ui/uploads-list-core'

/**
 * Injection keys for uploads list context.
 */
export const UploadsListProviderInjectionKey = {
  loading: Symbol('w3ui uploads list loading') as InjectionKey<Ref<UploadsListContextState['loading']>>,
  error: Symbol('w3ui uploads list error') as InjectionKey<Ref<UploadsListContextState['error']>>,
  data: Symbol('w3ui uploads list data') as InjectionKey<Ref<UploadsListContextState['data']>>,
  reload: Symbol('w3ui uploads list reload') as InjectionKey<UploadsListContextActions['reload']>
}

export interface UploadsListContextState {
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
}

export interface UploadsListContextActions {
  /**
   * Call to reload the uploads list.
   */
  reload: () => Promise<void>
}

export const UploadsListProvider = defineComponent({
  setup () {
    const identity = inject(AuthProviderInjectionKey.identity)

    const state = shallowReactive<UploadsListContextState>({
      loading: false,
      error: undefined,
      data: undefined
    })

    let controller = new AbortController()

    provide(UploadsListProviderInjectionKey.loading, computed(() => state.loading))
    provide(UploadsListProviderInjectionKey.error, computed(() => state.error))
    provide(UploadsListProviderInjectionKey.data, computed(() => state.data))

    const reload = async (): Promise<void> => {
      if (identity == null || identity.value == null) return
      controller.abort()
      controller = new AbortController()
      state.loading = true
      try {
        state.data = await listUploads(identity.value.signingPrincipal, { signal: controller.signal })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(err)
          // @ts-expect-error ts not know about cause
          error = new Error('failed to fetch uploads list', { cause: err })
        }
      } finally {
        state.loading = false
      }
    }
    provide(UploadsListProviderInjectionKey.reload, reload)

    watch([identity], reload)

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
