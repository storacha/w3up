import React, {
  useState, createContext, useContext, useCallback, useMemo
} from 'react'
import { useKeyring, KeyringContextState, KeyringContextActions } from './providers/Keyring'

export type AuthenticatorContextState = KeyringContextState & {
  /**
   * email to be used to "log in"
   */
  email?: string
  /**
   * has the authentication form been submitted?
   */
  submitted: boolean
  /**
   * A callback that can be passed to an `onSubmit` handler to
   * register a new space or log in using `email`
   */
  handleRegisterSubmit?: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
}

export type AuthenticatorContextActions = KeyringContextActions & {
  /**
   * Set an email to be used to log in or register.
   */
  setEmail: React.Dispatch<React.SetStateAction<string>>
}

export type AuthenticatorContextValue = [
  state: AuthenticatorContextState,
  actions: AuthenticatorContextActions
]

export const AuthenticatorContext = createContext<AuthenticatorContextValue>([
  {
    spaces: [],
    submitted: false
  },
  {
    setEmail: () => { throw new Error('missing set email function') },
    loadAgent: async () => { },
    unloadAgent: async () => { },
    resetAgent: async () => { },
    createSpace: async () => { throw new Error('missing keyring context provider') },
    setCurrentSpace: async () => { },
    registerSpace: async () => { },
    cancelRegisterSpace: () => { },
    getProofs: async () => []
  }
])

/**
 * Top level component of the headless Authenticator.
 *
 * Must be used inside a KeyringProvider.
 *
 * Designed to be used by Authenticator.Form, Authenticator.EmailInput
 * and others to make it easy to implement authentication UI.
 */
export function Authenticator (props: any): JSX.Element {
  const [state, actions] = useKeyring()
  const { createSpace, registerSpace } = actions
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleRegisterSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    try {
      await createSpace()
      await registerSpace(email)
    } catch (err: any) {
      throw new Error('failed to register', { cause: err })
    } finally {
      setSubmitted(false)
    }
  }, [setSubmitted, createSpace, registerSpace])

  const value = useMemo<AuthenticatorContextValue>(() => [
    { ...state, email, submitted, handleRegisterSubmit },
    { ...actions, setEmail }
  ], [state, actions, email, submitted, handleRegisterSubmit])
  return (
    <AuthenticatorContext.Provider {...props} value={value} />
  )
}

/**
 * Form component for the headless Authenticator.
 *
 * A `form` designed to work with `Authenticator`. Any passed props will
 * be passed along to the `form` component.
 */
Authenticator.Form = function Form (props: any) {
  const [{ handleRegisterSubmit }] = useAuthenticator()
  return (
    <form {...props} onSubmit={handleRegisterSubmit} />
  )
}

/**
 * Input component for the headless Uploader.
 *
 * An email `input` designed to work with `Authenticator.Form`. Any passed props will
 * be passed along to the `input` component.
 */
Authenticator.EmailInput = function EmailInput (props: any) {
  const [{ email }, { setEmail }] = useAuthenticator()
  return (
    <input {...props} type='email' value={email} onChange={e => setEmail(e.target.value)} />
  )
}

/**
 * A button that will cancel space registration.
 *
 * A `button` designed to work with `Authenticator.Form`. Any passed props will
 * be passed along to the `button` component.
 */
Authenticator.CancelButton = function CancelButton (props: any) {
  const [, { cancelRegisterSpace }] = useAuthenticator()
  return (
    <button {...props} onClick={() => { cancelRegisterSpace() }} />
  )
}

/**
 * Use the scoped authenticator context state from a parent `Authenticator`.
 */
export function useAuthenticator (): AuthenticatorContextValue {
  return useContext(AuthenticatorContext)
}
