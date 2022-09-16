import React, { createContext, useState, useContext, ReactNode } from 'react'
import { registerIdentity, loadDefaultIdentity, loadIdentity, storeIdentity, removeIdentity, Identity, AuthStatus } from '@w3ui/wallet-core'

export { AuthStatus }

export interface AuthContextValue {
  /**
   * The current identity
   */
  identity?: Identity
  /**
   * Load the default identity from secure storage.
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

export function AuthProvider ({ children }: AuthProviderProps): ReactNode {
  const [authStatus, setAuthStatus] = useState(AuthStatus.SignedOut)
  const [identity, setIdentity] = useState<Identity>()
  const [registerAbortController, setRegisterAbortController] = useState<AbortController>()

  const load = async (): Promise<void> => {
    const id = await loadDefaultIdentity()
    if (id != null) {
      setAuthStatus(AuthStatus.SignedIn)
      setIdentity(id)
    }
  }

  const cancel = (): void => {
    if (registerAbortController != null) {
      registerAbortController.abort()
    }
  }

  const register = async (email: string): Promise<void> => {
    if (identity != null) {
      if (identity.email === email) return
      throw new Error('unload current identity before registering a new one')
    } else {
      const id = await loadIdentity({ email })
      if (id != null && id.email === email) {
        setAuthStatus(AuthStatus.SignedIn)
        setIdentity(id)
        return
      }
    }

    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      const id = await registerIdentity(email, {
        onAuthStatusChange: setAuthStatus,
        signal: controller.signal
      })
      await storeIdentity(id)
      setIdentity(id)
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

export function useAuth (): AuthContextValue {
  return useContext(AuthContext)
}
