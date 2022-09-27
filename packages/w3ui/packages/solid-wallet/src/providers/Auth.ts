import { createContext, useContext, createSignal, createComponent, ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import { registerIdentity, loadDefaultIdentity, loadIdentity, storeIdentity, removeIdentity, Identity, AuthStatus, createIdentity, sendVerificationEmail, waitIdentityVerification, UnverifiedIdentity } from '@w3ui/wallet-core'

export interface AuthContextState {
  /**
   * The current identity
   */
  readonly identity?: Identity
  /**
   * Authentication status of the current identity.
   */
  readonly status: AuthStatus
}

export type AuthContextValue = [
  state: AuthContextState,
  actions: {
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
]

const defaultState: AuthContextState = {
  identity: undefined,
  status: AuthStatus.SignedOut
}

export const AuthContext = createContext<AuthContextValue>([
  defaultState,
  {
    loadDefaultIdentity: async () => {},
    unloadIdentity: async () => {},
    unloadAndRemoveIdentity: async () => {},
    registerAndStoreIdentity: async () => {},
    cancelRegisterAndStoreIdentity: () => {}
  }
])

export const AuthProvider: ParentComponent = props => {
  const [state, setState] = createStore({
    identity: defaultState.identity,
    status: defaultState.status
  })

  const [registerAbortController, setRegisterAbortController] = createSignal<AbortController>()

  const load = async (): Promise<void> => {
    const id = await loadDefaultIdentity()
    if (id != null) {
      setState('identity', id)
      if (id.verified) {
        setState('status', AuthStatus.SignedIn)
        return
      }
      await verifyAndRegisterAndStore(id as UnverifiedIdentity)
    }
  }

  const cancel = (): void => {
    const controller = registerAbortController()
    if (controller != null) {
      controller.abort()
    }
  }

  const register = async (email: string): Promise<void> => {
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

    setState('identity', id)

    if (id.verified) { // nothing to do
      setState('status', AuthStatus.SignedIn)
      return
    }

    const unverifiedIdentity = id as UnverifiedIdentity
    await sendVerificationEmail(unverifiedIdentity)
    await verifyAndRegisterAndStore(unverifiedIdentity)
  }

  const verifyAndRegisterAndStore = async (unverifiedIdentity: UnverifiedIdentity): Promise<void> => {
    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      setState('status', AuthStatus.EmailVerification)

      const { identity, proof } = await waitIdentityVerification(unverifiedIdentity, { signal: controller.signal })
      await registerIdentity(identity, proof)
      await storeIdentity(identity)

      setState('identity', identity)
      setState('status', AuthStatus.SignedIn)
    } catch (err) {
      setState('status', AuthStatus.SignedOut)
      if (!controller.signal.aborted) {
        throw err
      }
    }
  }

  const unload = async (): Promise<void> => {
    setState('status', AuthStatus.SignedOut)
    setState('identity', undefined)
  }

  const unloadAndRemove = async (): Promise<void> => {
    if (state.identity == null) {
      throw new Error('missing current identity')
    }
    await Promise.all([removeIdentity(state.identity), unload()])
  }

  const actions = {
    loadDefaultIdentity: load,
    unloadIdentity: unload,
    unloadAndRemoveIdentity: unloadAndRemove,
    registerAndStoreIdentity: register,
    cancelRegisterAndStoreIdentity: cancel
  }

  return createComponent(AuthContext.Provider, {
    value: [state, actions],
    get children () {
      return props.children
    }
  })
}

export function useAuth (): AuthContextValue {
  return useContext(AuthContext)
}
