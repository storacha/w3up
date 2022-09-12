import React, { createContext, useState, useContext, ReactNode } from 'react'
import { registerIdentity, Identity, AuthStatus } from '@w3ui/wallet-core'

export { AuthStatus }

export interface AuthContextValue {
  identity?: Identity
  loadIdentity: () => void
  unloadIdentity: () => void
  registerIdentity: (email: string) => Promise<void>
  cancelRegisterIdentity: () => void
  authStatus: AuthStatus
}

export const AuthContext = createContext<AuthContextValue>({
  identity: undefined,
  loadIdentity: () => {},
  unloadIdentity: () => {},
  registerIdentity: async () => {},
  cancelRegisterIdentity: () => {},
  authStatus: AuthStatus.SignedOut
})

export interface AuthProviderProps {
  children?: ReactNode
}

export function AuthProvider ({ children }: AuthProviderProps): ReactNode {
  const [authStatus, setAuthStatus] = useState(AuthStatus.SignedOut)
  const [identity, setIdentity] = useState<Identity>()
  const [registerAbortController, setRegisterAbortController] = useState<AbortController>()

  const load = (): void => {
    // TODO: load identity from secure storage
  }

  const cancel = () => {
    registerAbortController && registerAbortController.abort()
  }

  const register = async (email: string): Promise<void> => {
    if (identity != null) {
      if (identity.email === email) return
      throw new Error('unload current identity before registering a new one')
    }

    const controller = new AbortController()
    setRegisterAbortController(controller)

    try {
      const id = await registerIdentity(email, {
        onAuthStatusChange: setAuthStatus,
        signal: controller.signal
      })
      setIdentity(id)
    } catch (err) {
      setAuthStatus(AuthStatus.SignedOut)
      if (!controller.signal.aborted) {
        throw err
      }
    }
  }

  const unload = () => setIdentity(undefined)

  const value = {
    authStatus,
    identity,
    loadIdentity: load,
    unloadIdentity: unload,
    registerIdentity: register,
    cancelRegisterIdentity: cancel
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
