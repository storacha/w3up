import React, { createContext, useState, useContext, ReactNode } from 'react'
import { registerIdentity, loadDefaultIdentity, loadIdentity, storeIdentity, removeIdentity, Identity, AuthStatus, createIdentity, sendVerificationEmail, waitIdentityVerification, UnverifiedIdentity } from '@w3ui/keyring-core'

export interface AuthContextValue {
  /**
   * The current identity
   */
  identity?: Identity
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
  /**
   * Authentication status of the current identity.
   */
  authStatus: AuthStatus
}

export const AuthContext = createContext<AuthContextValue>({
  identity: undefined,
  loadDefaultIdentity: async () => {},
  unloadIdentity: async () => {},
  unloadAndRemoveIdentity: async () => {},
  registerAndStoreIdentity: async () => {},
  cancelRegisterAndStoreIdentity: () => {},
  authStatus: AuthStatus.SignedOut
})

export interface AuthProviderProps {
  children?: ReactNode
}

/**
 * Provider for authentication with the service.
 */
export function AuthProvider ({ children }: AuthProviderProps): ReactNode {
  const [authStatus, setAuthStatus] = useState(AuthStatus.SignedOut)
  const [identity, setIdentity] = useState<Identity>()
  const [registerAbortController, setRegisterAbortController] = useState<AbortController>()

  const load = async (): Promise<void> => {
    const id = await loadDefaultIdentity()
    if (id != null) {
      setIdentity(id)
      if (id.verified) {
        setAuthStatus(AuthStatus.SignedIn)
        return
      }
      await verifyAndRegisterAndStore(id as UnverifiedIdentity)
    }
  }

  const cancel = (): void => {
    if (registerAbortController != null) {
      registerAbortController.abort()
    }
  }

  const register = async (email: string): Promise<void> => {
    let id: Identity | undefined
    if (identity != null) {
      if (identity.email !== email) {
        throw new Error('unload current identity before registering a new one')
      }
      id = identity
    } else {
      id = await loadIdentity({ email })
      if (id == null) {
        id = await createIdentity({ email })
        await storeIdentity(id)
      }
    }

    setIdentity(id)

    if (id.verified) { // nothing to do
      setAuthStatus(AuthStatus.SignedIn)
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
      setAuthStatus(AuthStatus.EmailVerification)

      const { identity, proof } = await waitIdentityVerification(unverifiedIdentity, { signal: controller.signal })
      await registerIdentity(identity, proof)
      await storeIdentity(identity)

      setIdentity(identity)
      setAuthStatus(AuthStatus.SignedIn)
    } catch (err) {
      setAuthStatus(AuthStatus.SignedOut)
      if (!controller.signal.aborted) {
        throw err
      }
    }
  }

  const unload = async (): Promise<void> => {
    setAuthStatus(AuthStatus.SignedOut)
    setIdentity(undefined)
  }

  const unloadAndRemove = async (): Promise<void> => {
    if (identity == null) {
      throw new Error('missing current identity')
    }
    await Promise.all([removeIdentity(identity), unload()])
  }

  const value = {
    authStatus,
    identity,
    loadDefaultIdentity: load,
    unloadIdentity: unload,
    unloadAndRemoveIdentity: unloadAndRemove,
    registerAndStoreIdentity: register,
    cancelRegisterAndStoreIdentity: cancel
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Use the scoped auth context state from a parent AuthProvider.
 */
export function useAuth (): AuthContextValue {
  return useContext(AuthContext)
}
