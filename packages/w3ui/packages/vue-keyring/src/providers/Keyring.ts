import type {
  KeyringContextState,
  KeyringContextActions,
  ServiceConfig,
  Email,
  Client
} from '@w3ui/keyring-core'
import type { Capability, DID, DIDKey, Proof } from '@ucanto/interface'

import {
  defineComponent,
  provide,
  computed,
  InjectionKey,
  Ref,
  shallowReactive,
  Component
} from 'vue'
import {
  createClient,
  getPlan as getPlanWithClient,
  login,
  useAccount,
  W3UI_ACCOUNT_LOCALSTORAGE_KEY
} from '@w3ui/keyring-core'

export { KeyringContextState, KeyringContextActions }

interface KeyringProviderInjectionKeyType {
  account: InjectionKey<Ref<KeyringContextState['account']>>
  space: InjectionKey<Ref<KeyringContextState['space']>>
  spaces: InjectionKey<Ref<KeyringContextState['spaces']>>
  agent: InjectionKey<Ref<KeyringContextState['agent']>>
  client: InjectionKey<Ref<KeyringContextState['client']>>
  loadAgent: InjectionKey<KeyringContextActions['loadAgent']>
  unloadAgent: InjectionKey<KeyringContextActions['unloadAgent']>
  resetAgent: InjectionKey<KeyringContextActions['resetAgent']>
  createSpace: InjectionKey<KeyringContextActions['createSpace']>
  setCurrentSpace: InjectionKey<KeyringContextActions['setCurrentSpace']>
  registerSpace: InjectionKey<KeyringContextActions['registerSpace']>
  getProofs: InjectionKey<KeyringContextActions['getProofs']>
  authorize: InjectionKey<KeyringContextActions['authorize']>
  cancelAuthorize: InjectionKey<KeyringContextActions['cancelAuthorize']>
  getPlan: InjectionKey<KeyringContextActions['getPlan']>
}

/**
 * Injection keys for keyring provider context.
 */
export const KeyringProviderInjectionKey: KeyringProviderInjectionKeyType = {
  account: Symbol('w3ui keyring account'),
  space: Symbol('w3ui keyring space'),
  spaces: Symbol('w3ui keyring spaces'),
  agent: Symbol('w3ui keyring agent'),
  client: Symbol('w3ui keyring client'),
  loadAgent: Symbol('w3ui keyring loadAgent'),
  unloadAgent: Symbol('w3ui keyring unloadAgent'),
  resetAgent: Symbol('w3ui keyring resetAgent'),
  createSpace: Symbol('w3ui keyring createSpace'),
  setCurrentSpace: Symbol('w3ui keyring setCurrentSpace'),
  registerSpace: Symbol('w3ui keyring registerSpace'),
  getProofs: Symbol('w3ui keyring getProofs'),
  authorize: Symbol('w3ui keyring authorize'),
  cancelAuthorize: Symbol('w3ui keyring cancelAuthorize'),
  getPlan: Symbol('w3ui keyring getPlan')
}

export interface KeyringProviderProps extends ServiceConfig { }

/**
 * Provider for authentication with the service.
 */
export const KeyringProvider: Component<KeyringProviderProps> = defineComponent<KeyringProviderProps>({
  setup ({ servicePrincipal, connection }) {
    const state = shallowReactive<KeyringContextState>({
      agent: undefined,
      client: undefined,
      space: undefined,
      spaces: [],
      account: window.localStorage.getItem(W3UI_ACCOUNT_LOCALSTORAGE_KEY) ?? undefined
    })
    let client: Client | undefined
    let registerAbortController: AbortController

    provide(
      KeyringProviderInjectionKey.agent,
      computed(() => state.agent)
    )
    provide(
      KeyringProviderInjectionKey.client,
      computed(() => state.client)
    )
    provide(
      KeyringProviderInjectionKey.space,
      computed(() => state.space)
    )
    provide(
      KeyringProviderInjectionKey.spaces,
      computed(() => state.spaces)
    )
    provide(
      KeyringProviderInjectionKey.account,
      computed(() => state.account)
    )

    const getClient = async (): Promise<Client> => {
      if (client == null) {
        client = await createClient({ servicePrincipal, connection })
        state.client = client
        state.agent = client.agent.issuer
        state.space = client.currentSpace()
        state.spaces = client.spaces()
      }
      return client
    }

    provide(KeyringProviderInjectionKey.authorize,
      async (email: `${string}@${string}`): Promise<void> => {
        const c = await getClient()
        const controller = new AbortController()
        registerAbortController = controller

        try {
          await login(c, email)
          state.account = email
          window.localStorage.setItem(W3UI_ACCOUNT_LOCALSTORAGE_KEY, email)
          const newSpaces = c.spaces()
          state.spaces = newSpaces
          const newCurrentSpace = c.currentSpace() ?? newSpaces[0]
          if (newCurrentSpace != null) {
            state.space = newCurrentSpace
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            throw error
          }
        }
      })

    provide(KeyringProviderInjectionKey.cancelAuthorize, (): void => {
      if (registerAbortController != null) {
        registerAbortController.abort()
      }
    })

    provide(
      KeyringProviderInjectionKey.createSpace,
      async (name?: string): Promise<DID> => {
        const c = await getClient()
        const space = await c.createSpace(name ?? 'Unnamed Space')
        const did = space.did()
        await c.setCurrentSpace(did)
        state.space = c.currentSpace()
        return did
      }
    )

    provide(
      KeyringProviderInjectionKey.registerSpace,
      async (email: string): Promise<void> => {
        const c = await getClient()
        const controller = new AbortController()
        registerAbortController = controller
        const account = useAccount(c, { email })
        const space = c.currentSpace()
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (account && space) {
          try {
            await account.provision(space.did() as DID<'key'>)
            state.space = c.currentSpace()
            state.spaces = c.spaces()
          } catch (error) {
            if (!controller.signal.aborted) {
              throw error
            }
          }
        }
      }
    )

    provide(
      KeyringProviderInjectionKey.setCurrentSpace,
      async (did: DID): Promise<void> => {
        const c = await getClient()
        await c.setCurrentSpace(did as DIDKey)
        state.space = c.currentSpace()
      }
    )

    const loadAgent = async (): Promise<void> => {
      if (client != null) return
      await getClient()
    }
    provide(KeyringProviderInjectionKey.loadAgent, loadAgent)

    const unloadAgent = async (): Promise<void> => {
      state.space = undefined
      state.spaces = []
      state.client = undefined
      state.account = undefined
      client = undefined
    }
    provide(KeyringProviderInjectionKey.unloadAgent, unloadAgent)

    provide(KeyringProviderInjectionKey.resetAgent, async (): Promise<void> => {
      const agent = await getClient()
      // @ts-expect-error store is there but the type doesn't expose it - TODO add store to Agent type
      await Promise.all([agent.store.reset(), unloadAgent()])
    })

    provide(
      KeyringProviderInjectionKey.getProofs,
      async (caps: Capability[]): Promise<Proof[]> => {
        const c = await getClient()
        return c.agent.proofs(caps)
      }
    )

    provide(
      KeyringProviderInjectionKey.getPlan,
      async (email: Email) => {
        const c = await getClient()
        return await getPlanWithClient(c, email)
      }
    )

    // void loadAgent()

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    return this.$slots.default?.()
  }
})
