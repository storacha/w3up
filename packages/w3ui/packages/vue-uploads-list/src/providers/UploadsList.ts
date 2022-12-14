import { defineComponent, provide, InjectionKey, inject, shallowReactive, Ref, computed, watch } from 'vue'
import { KeyringProviderInjectionKey } from '@w3ui/vue-keyring'
import { UploadsListContextState, UploadsListContextActions, ServiceConfig, list } from '@w3ui/uploads-list-core'
import { list as uploadList } from '@web3-storage/capabilities/upload'

/**
 * Injection keys for uploads list context.
 */
export const UploadsListProviderInjectionKey = {
  loading: Symbol('w3ui uploads list loading') as InjectionKey<Ref<UploadsListContextState['loading']>>,
  error: Symbol('w3ui uploads list error') as InjectionKey<Ref<UploadsListContextState['error']>>,
  data: Symbol('w3ui uploads list data') as InjectionKey<Ref<UploadsListContextState['data']>>,
  next: Symbol('w3ui uploads list next') as InjectionKey<UploadsListContextActions['next']>,
  reload: Symbol('w3ui uploads list reload') as InjectionKey<UploadsListContextActions['reload']>
}

export interface UploadsListProviderProps extends ServiceConfig {
  /**
   * Maximum number of items to return per page.
   */
  size?: number
}

/**
 * Provider for a list of items uploaded by the current identity.
 */
export const UploadsListProvider = defineComponent<UploadsListProviderProps>({
  setup ({ size, servicePrincipal, connection }) {
    const space = inject(KeyringProviderInjectionKey.space)
    const agent = inject(KeyringProviderInjectionKey.agent)
    const getProofs = inject(KeyringProviderInjectionKey.getProofs)

    const state = shallowReactive<UploadsListContextState>({
      loading: false,
      error: undefined,
      data: undefined
    })

    let cursor: string | undefined
    let controller = new AbortController()

    provide(UploadsListProviderInjectionKey.loading, computed(() => state.loading))
    provide(UploadsListProviderInjectionKey.error, computed(() => state.error))
    provide(UploadsListProviderInjectionKey.data, computed(() => state.data))

    const loadPage = async (cursor?: string): Promise<void> => {
      if (space?.value == null) return
      if (agent?.value == null) return
      if (getProofs == null) throw new Error('missing getProofs')

      controller.abort()
      const newController = new AbortController()
      controller = newController
      state.loading = true

      try {
        const conf = {
          issuer: agent.value,
          with: space.value.did(),
          audience: servicePrincipal,
          proofs: await getProofs([{ can: uploadList.can, with: space.value.did() }])
        }
        const page = await list(conf, {
          cursor,
          size,
          signal: newController.signal,
          connection
        })
        cursor = page.cursor
        state.data = page.results
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(err)
          // @ts-expect-error ts not know about cause
          setError(new Error('failed to fetch uploads list', { cause: err }))
        }
      } finally {
        state.loading = false
      }
    }

    provide(UploadsListProviderInjectionKey.reload, async (): Promise<void> => {
      cursor = undefined
      await loadPage()
    })

    provide(UploadsListProviderInjectionKey.next, async (): Promise<void> => {
      await loadPage(cursor)
    })

    watch([space, agent], async () => await loadPage())

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
