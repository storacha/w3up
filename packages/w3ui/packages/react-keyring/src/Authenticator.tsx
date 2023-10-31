import type { As, Component, Props, Options } from 'ariakit-react-utils'
import type { ChangeEvent } from 'react'

import React, {
  Fragment,
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect
} from 'react'
import { createComponent, createElement } from 'ariakit-react-utils'
import {
  useKeyring,
  KeyringContextState,
  KeyringContextActions
} from './providers/Keyring'

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
    setEmail: () => {
      throw new Error('missing set email function')
    },
    loadAgent: async () => {},
    unloadAgent: async () => {},
    resetAgent: async () => {},
    createSpace: async () => {
      throw new Error('missing keyring context provider')
    },
    setCurrentSpace: async () => {},
    registerSpace: async () => {},
    cancelAuthorize: () => {},
    getProofs: async () => [],
    createDelegation: async () => {
      throw new Error('missing keyring context provider')
    },
    addSpace: async () => {},
    authorize: async () => {},
    getPlan: async () => ({ error: { name: 'KeyringContextMissing', message: 'missing keyring context provider' } })
  }
])

export const AgentLoader = ({
  children
}: {
  children: JSX.Element
}): JSX.Element => {
  const [, { loadAgent }] = useKeyring()
  useEffect(() => {
    void loadAgent()
  }, []) // load agent - once.
  return children
}

export type AuthenticatorRootOptions<T extends As = typeof Fragment> =
  Options<T>
export type AuthenticatorRootProps<T extends As = typeof Fragment> = Props<
AuthenticatorRootOptions<T>
>

/**
 * Top level component of the headless Authenticator.
 *
 * Must be used inside a KeyringProvider.
 *
 * Designed to be used by Authenticator.Form, Authenticator.EmailInput
 * and others to make it easy to implement authentication UI.
 */
export const AuthenticatorRoot: Component<AuthenticatorRootProps> =
  createComponent((props) => {
    const [state, actions] = useKeyring()
    const { authorize } = actions
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleRegisterSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitted(true)
        try {
          await authorize(email as '{string}@{string}')
        } catch (error: any) {
          // eslint-disable-next-line no-console
          console.error('failed to register:', error)
          throw new Error('failed to register', { cause: error })
        } finally {
          setSubmitted(false)
        }
      },
      [email, setSubmitted, authorize]
    )

    const value = useMemo<AuthenticatorContextValue>(
      () => [
        { ...state, email, submitted, handleRegisterSubmit },
        { ...actions, setEmail }
      ],
      [state, actions, email, submitted, handleRegisterSubmit]
    )
    return (
      <AgentLoader>
        <AuthenticatorContext.Provider value={value}>
          {createElement(Fragment, props)}
        </AuthenticatorContext.Provider>
      </AgentLoader>
    )
  })

export type FormOptions<T extends As = 'form'> = Options<T>
export type FormProps<T extends As = 'form'> = Props<FormOptions<T>>

/**
 * Form component for the headless Authenticator.
 *
 * A `form` designed to work with `Authenticator`. Any passed props will
 * be passed along to the `form` component.
 */
export const Form: Component<FormProps> = createComponent((props) => {
  const [{ handleRegisterSubmit }] = useAuthenticator()
  return createElement('form', { ...props, onSubmit: handleRegisterSubmit })
})

export type EmailInputOptions<T extends As = 'input'> = Options<T>
export type EmailInputProps<T extends As = 'input'> = Props<
EmailInputOptions<T>
>

/**
 * Input component for the headless Uploader.
 *
 * An email `input` designed to work with `Authenticator.Form`. Any passed props will
 * be passed along to the `input` component.
 */
export const EmailInput: Component<EmailInputProps> = createComponent(
  (props) => {
    const [{ email }, { setEmail }] = useAuthenticator()
    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
    }, [])
    return createElement('input', {
      ...props,
      type: 'email',
      value: email,
      onChange
    })
  }
)

export type CancelButtonOptions<T extends As = 'button'> = Options<T>
export type CancelButtonProps<T extends As = 'button'> = Props<
CancelButtonOptions<T>
>

/**
 * A button that will cancel space registration.
 *
 * A `button` designed to work with `Authenticator.Form`. Any passed props will
 * be passed along to the `button` component.
 */
export const CancelButton: Component<CancelButtonProps> = createComponent(
  (props) => {
    const [, { cancelAuthorize }] = useAuthenticator()
    return createElement('button', { ...props, onClick: cancelAuthorize })
  }
)

/**
 * Use the scoped authenticator context state from a parent `Authenticator`.
 */
export function useAuthenticator (): AuthenticatorContextValue {
  return useContext(AuthenticatorContext)
}

export const Authenticator = Object.assign(AuthenticatorRoot, {
  Form,
  EmailInput,
  CancelButton
})
