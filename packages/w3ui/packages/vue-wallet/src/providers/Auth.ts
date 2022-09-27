import { defineComponent, reactive, provide, computed, InjectionKey, ComputedRef } from 'vue'
import { registerIdentity, loadDefaultIdentity, loadIdentity, storeIdentity, removeIdentity, Identity, AuthStatus, createIdentity, sendVerificationEmail, waitIdentityVerification, UnverifiedIdentity } from '@w3ui/wallet-core'

/**
 * Injection keys for auth provider context.
 */
export const AuthProviderInjectionKey = {
  identity: Symbol('w3ui wallet identity') as InjectionKey<ComputedRef<AuthContextState['identity']>>,
  status: Symbol('w3ui wallet auth status') as InjectionKey<ComputedRef<AuthContextState['status']>>,
  loadDefaultIdentity: Symbol('w3ui wallet loadDefaultIdentity') as InjectionKey<AuthContextActions['loadDefaultIdentity']>,
  cancelRegisterAndStoreIdentity: Symbol('w3ui wallet cancelRegisterAndStoreIdentityKey') as InjectionKey<AuthContextActions['cancelRegisterAndStoreIdentity']>,
  registerAndStoreIdentity: Symbol('w3ui wallet registerAndStoreIdentity') as InjectionKey<AuthContextActions['registerAndStoreIdentity']>,
  unloadIdentity: Symbol('w3ui wallet unloadIdentity') as InjectionKey<AuthContextActions['unloadIdentity']>,
  unloadAndRemoveIdentity: Symbol('w3ui wallet unloadAndRemoveIdentity') as InjectionKey<AuthContextActions['unloadAndRemoveIdentity']>
}

export interface AuthContextState {
  /**
   * The current identity
   */
  identity?: Identity
  /**
   * Authentication status of the current identity.
   */
  status: AuthStatus
}

export interface AuthContextActions {
  /**
   * Load the default identity from secure storage. If the identity is not
   * verified, the registration flow will be automatically resumed.
   */
  loadDefaultIdentity: () => Promise<void>
  /**
   * Unload the current identity from memory.
   */
  unloadIdentity: () => Promise<void>
  /**
   * Unload the current identity from memory and remove from secure storage.
   */
  unloadAndRemoveIdentity: () => Promise<void>
  /**
   * Register a new identity, verify the email address and store in secure
   * storage. Use cancelRegisterAndStoreIdentity to abort.
   */
  registerAndStoreIdentity: (email: string) => Promise<void>
  /**
   * Abort an ongoing identity registration.
   */
  cancelRegisterAndStoreIdentity: () => void
}

export const AuthProvider = defineComponent({
  setup () {
    const state = reactive<AuthContextState>({
      identity: undefined,
      status: AuthStatus.SignedOut
    })
    let registerAbortController: AbortController

    provide(AuthProviderInjectionKey.identity, computed(() => state.identity))
    provide(AuthProviderInjectionKey.status, computed(() => state.status))

    const load = async (): Promise<void> => {
      const id = await loadDefaultIdentity()
      if (id != null) {
        state.identity = id
        if (id.verified) {
          state.status = AuthStatus.SignedIn
          return
        }
        await verifyAndRegisterAndStore(id as UnverifiedIdentity)
      }
    }
    provide(AuthProviderInjectionKey.loadDefaultIdentity, load)

    provide(AuthProviderInjectionKey.cancelRegisterAndStoreIdentity, (): void => {
      if (registerAbortController != null) {
        registerAbortController.abort()
      }
    })

    provide(AuthProviderInjectionKey.registerAndStoreIdentity, async (email: string): Promise<void> => {
      let id: Identity | undefined
      if (state.identity != null) {
        if (state.identity.email !== email) {
          throw new Error('unload current identity before registering a new one')
        }
        id = state.identity
      } else {
        id = await loadIdentity({ email })
        if (id == null) {
          id = await createIdentity({ email })
          await storeIdentity(id)
        }
      }

      state.identity = id

      if (id.verified) { // nothing to do
        state.status = AuthStatus.SignedIn
        return
      }

      const unverifiedIdentity = id as UnverifiedIdentity
      await sendVerificationEmail(unverifiedIdentity)
      await verifyAndRegisterAndStore(unverifiedIdentity)
    })

    const verifyAndRegisterAndStore = async (unverifiedIdentity: UnverifiedIdentity): Promise<void> => {
      const controller = new AbortController()
      registerAbortController = controller

      try {
        state.status = AuthStatus.EmailVerification

        const { identity, proof } = await waitIdentityVerification(unverifiedIdentity, { signal: controller.signal })
        await registerIdentity(identity, proof)
        await storeIdentity(identity)

        state.identity = identity
        state.status = AuthStatus.SignedIn
      } catch (err) {
        state.status = AuthStatus.SignedOut
        if (!controller.signal.aborted) {
          throw err
        }
      }
    }

    const unload = async (): Promise<void> => {
      state.status = AuthStatus.SignedOut
      state.identity = undefined
    }
    provide(AuthProviderInjectionKey.unloadIdentity, unload)

    provide(AuthProviderInjectionKey.unloadAndRemoveIdentity, async (): Promise<void> => {
      if (state.identity == null) {
        throw new Error('missing current identity')
      }
      await Promise.all([removeIdentity(state.identity), unload()])
    })

    void load()

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
