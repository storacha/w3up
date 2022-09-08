import React, { createContext, useState, useContext, ReactNode } from 'react'
import * as Keypair from '@ucanto/authority'
import * as API from '@ucanto/interface'
import { Authority } from '@ucanto/authority'
import * as Access from '@web3-storage/access'

const accessApiUrl = new URL('https://access-api.web3.storage')
const accessDid = Authority.parse('did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9')

export interface Identity {
  email: string
  signingAuthority: API.SigningAuthority
}

export enum AuthStatus {
  SignedIn,
  SignedOut,
  /**
   * Email verification email has been sent.
   */
  EmailVerification
}

export interface AuthContextValue {
  identity?: Identity
  loadIdentity: () => void
  unloadIdentity: () => void
  registerIdentity: (email: string) => Promise<void>
  authStatus: AuthStatus
}

export const AuthContext = createContext<AuthContextValue>({
  identity: undefined,
  loadIdentity: () => {},
  unloadIdentity: () => {},
  registerIdentity: async () => {},
  authStatus: AuthStatus.SignedOut
})

export interface AuthProviderProps {
  children?: ReactNode
}

export function AuthProvider ({ children }: AuthProviderProps): ReactNode {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.SignedOut)
  const [identity, setIdentity] = useState<Identity|undefined>(undefined)

  const loadIdentity = (): void => {
    // TODO: load identity from secure storage
  }

  const registerIdentity = async (email: string): Promise<void> => {
    if (email == null || email === '') {
      throw new Error('missing email address')
    }
    if (identity != null) {
      if (identity.email === email) return
      throw new Error('Unload current identity before registering a new one')
    }

    const signingAuthority = await Keypair.SigningAuthority.generate()

    await Access.validate({
      audience: accessDid,
      url: accessApiUrl,
      issuer: signingAuthority,
      caveats: { as: `mailto:${email}` }
    })

    setAuthStatus(AuthStatus.EmailVerification)

    try {
      // TODO: can we cancel this?
      const proof = await Access.pullRegisterDelegation({
        issuer: signingAuthority,
        url: accessApiUrl
      })

      await Access.register({
        audience: accessDid,
        url: accessApiUrl,
        issuer: signingAuthority,
        proof
      })

      // TODO: save to storage
      setIdentity({ email, signingAuthority })
      setAuthStatus(AuthStatus.SignedIn)
    } catch (err) {
      setAuthStatus(AuthStatus.SignedOut)
    }
  }

  const unloadIdentity = (): void => setIdentity(undefined)

  const value = { authStatus, identity, loadIdentity, unloadIdentity, registerIdentity }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth (): AuthContextValue {
  return useContext(AuthContext)
}
