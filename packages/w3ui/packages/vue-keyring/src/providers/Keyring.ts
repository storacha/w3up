import { defineComponent, provide, computed, InjectionKey, Ref, shallowReactive } from 'vue'
import { createAgent, getCurrentSpace, getSpaces } from '@w3ui/keyring-core'
import type { KeyringContextState, KeyringContextActions, ServiceConfig } from '@w3ui/keyring-core'

import type { Agent } from '@web3-storage/access'
import type { Capability, DID, Proof } from '@ucanto/interface'

export { KeyringContextState, KeyringContextActions }

interface KeyringProviderInjectionKeyType {
  space: InjectionKey<Ref<KeyringContextState['space']>>
  spaces: InjectionKey<Ref<KeyringContextState['spaces']>>
  agent: InjectionKey<Ref<KeyringContextState['agent']>>
  loadAgent: InjectionKey<KeyringContextActions['loadAgent']>
  unloadAgent: InjectionKey<KeyringContextActions['unloadAgent']>
  resetAgent: InjectionKey<KeyringContextActions['resetAgent']>
  createSpace: InjectionKey<KeyringContextActions['createSpace']>
  setCurrentSpace: InjectionKey<KeyringContextActions['setCurrentSpace']>
  registerSpace: InjectionKey<KeyringContextActions['registerSpace']>
  cancelRegisterSpace: InjectionKey<KeyringContextActions['cancelRegisterSpace']>
  getProofs: InjectionKey<KeyringContextActions['getProofs']>
}

/**
 * Injection keys for keyring provider context.
 */
export const KeyringProviderInjectionKey: KeyringProviderInjectionKeyType = {
  space: Symbol('w3ui keyring space'),
  spaces: Symbol('w3ui keyring spaces'),
  agent: Symbol('w3ui keyring agent'),
  loadAgent: Symbol('w3ui keyring loadAgent'),
  unloadAgent: Symbol('w3ui keyring unloadAgent'),
  resetAgent: Symbol('w3ui keyring resetAgent'),
  createSpace: Symbol('w3ui keyring createSpace'),
  setCurrentSpace: Symbol('w3ui keyring setCurrentSpace'),
  registerSpace: Symbol('w3ui keyring registerSpace'),
  cancelRegisterSpace: Symbol('w3ui keyring cancelRegisterSpace'),
  getProofs: Symbol('w3ui keyring getProofs')
}

export interface KeyringProviderProps extends ServiceConfig {}

/**
 * Provider for authentication with the service.
 */
export const KeyringProvider = defineComponent<KeyringProviderProps>({
  setup ({ servicePrincipal, connection }) {
    const state = shallowReactive<KeyringContextState>({
      agent: undefined,
      space: undefined,
      spaces: []
    })
    let agent: Agent | undefined
    let registerAbortController: AbortController

    provide(KeyringProviderInjectionKey.agent, computed(() => state.agent))
    provide(KeyringProviderInjectionKey.space, computed(() => state.space))
    provide(KeyringProviderInjectionKey.spaces, computed(() => state.spaces))

    const getAgent = async (): Promise<Agent> => {
      if (agent == null) {
        agent = await createAgent({ servicePrincipal, connection })
        state.agent = agent.issuer
        state.space = getCurrentSpace(agent)
        state.spaces = getSpaces(agent)
      }
      return agent
    }

    provide(KeyringProviderInjectionKey.cancelRegisterSpace, (): void => {
      if (registerAbortController != null) {
        registerAbortController.abort()
      }
    })

    provide(KeyringProviderInjectionKey.createSpace, async (name?: string): Promise<DID> => {
      const agent = await getAgent()
      const { did } = await agent.createSpace(name)
      await agent.setCurrentSpace(did)
      state.space = getCurrentSpace(agent)
      return did
    })

    provide(KeyringProviderInjectionKey.registerSpace, async (email: string): Promise<void> => {
      const agent = await getAgent()
      const controller = new AbortController()
      registerAbortController = controller

      try {
        await agent.registerSpace(email, { signal: controller.signal })
        state.space = getCurrentSpace(agent)
        state.spaces = getSpaces(agent)
      } catch (err) {
        if (!controller.signal.aborted) {
          throw err
        }
      }
    })

    provide(KeyringProviderInjectionKey.setCurrentSpace, async (did: DID): Promise<void> => {
      const agent = await getAgent()
      await agent.setCurrentSpace(did)
      state.space = getCurrentSpace(agent)
    })

    const loadAgent = async (): Promise<void> => {
      if (agent != null) return
      await getAgent()
    }
    provide(KeyringProviderInjectionKey.loadAgent, loadAgent)

    const unloadAgent = async (): Promise<void> => {
      state.space = undefined
      state.spaces = []
      state.agent = undefined
      agent = undefined
    }
    provide(KeyringProviderInjectionKey.unloadAgent, unloadAgent)

    provide(KeyringProviderInjectionKey.resetAgent, async (): Promise<void> => {
      const agent = await getAgent()
      // @ts-expect-error
      await Promise.all([agent.store.reset(), unloadAgent()])
    })

    provide(KeyringProviderInjectionKey.getProofs, async (caps: Capability[]): Promise<Proof[]> => {
      const agent = await getAgent()
      return agent.proofs(caps)
    })

    // void loadAgent()

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
