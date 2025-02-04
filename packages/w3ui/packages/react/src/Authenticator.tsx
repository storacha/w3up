import type { As, Component, Props, Options } from 'ariakit-react-utils'
import type { ChangeEvent } from 'react'

import React, {
  Fragment,
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { createComponent, createElement } from 'ariakit-react-utils'
import { useW3, ContextState, ContextActions } from './providers/Provider.js'

export type AuthenticatorContextState = ContextState & {
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

export type AuthenticatorContextActions = ContextActions & {
  /**
   * Set an email to be used to log in or register.
   */
  setEmail: React.Dispatch<React.SetStateAction<string>>
  /**
   * Cancel a pending login.
   */
  cancelLogin: () => void
}

export type AuthenticatorContextValue = [
  state: AuthenticatorContextState,
  actions: AuthenticatorContextActions
]

export const AuthenticatorContextDefaultValue: AuthenticatorContextValue = [
  {
    accounts: [],
    spaces: [],
    submitted: false,
  },
  {
    setEmail: () => {
      throw new Error('missing set email function')
    },
    cancelLogin: () => {
      throw new Error('missing cancel login function')
    },
    logout: () => {
      throw new Error('missing logout function')
    },
  },
]

export const AuthenticatorContext = createContext<AuthenticatorContextValue>(
  AuthenticatorContextDefaultValue
)

export type AuthenticatorRootOptions<T extends As = typeof Fragment> =
  Options<T>
export type AuthenticatorRootProps<T extends As = typeof Fragment> = Props<
  AuthenticatorRootOptions<T>
>

/**
 * Top level component of the headless Authenticator.
 *
 * Must be used inside a w3ui Provider.
 *
 * Designed to be used by Authenticator.Form, Authenticator.EmailInput
 * and others to make it easy to implement authentication UI.
 */
export const AuthenticatorRoot: Component<AuthenticatorRootProps> =
  createComponent((props) => {
    const [state, actions] = useW3()
    const { client } = state
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [loginAbortController, setLoginAbortController] =
      useState<AbortController>()

    const handleRegisterSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const controller = new AbortController()
        setLoginAbortController(controller)
        setSubmitted(true)
        try {
          if (client === undefined) throw new Error('missing client')
          await client.login(email as '{string}@{string}', {
            signal: controller?.signal,
          })
        } catch (error: any) {
          if (!controller.signal.aborted) {
            // eslint-disable-next-line no-console
            console.error('failed to register:', error)
            throw new Error('failed to register', { cause: error })
          }
        } finally {
          setSubmitted(false)
        }
      },
      [email, setSubmitted]
    )

    const value = useMemo<AuthenticatorContextValue>(
      () => [
        { ...state, email, submitted, handleRegisterSubmit },
        {
          ...actions,
          setEmail,
          cancelLogin: () => {
            loginAbortController?.abort()
          },
        },
      ],
      [state, actions, email, submitted, handleRegisterSubmit]
    )
    return (
      <AuthenticatorContext.Provider value={value}>
        {createElement(Fragment, props)}
      </AuthenticatorContext.Provider>
    )
  })

export type AuthenticatorFormOptions<T extends As = 'form'> = Options<T>
export type AuthenticatorFormProps<T extends As = 'form'> = Props<
  AuthenticatorFormOptions<T>
>

/**
 * Form component for the headless Authenticator.
 *
 * A `form` designed to work with `Authenticator`. Any passed props will
 * be passed along to the `form` component.
 */
export const AuthenticatorForm: Component<AuthenticatorFormProps> =
  createComponent((props) => {
    const [{ handleRegisterSubmit }] = useAuthenticator()
    return createElement('form', { ...props, onSubmit: handleRegisterSubmit })
  })

export type AuthenticatorEmailInputOptions<T extends As = 'input'> = Options<T>
export type AuthenticatorEmailInputProps<T extends As = 'input'> = Props<
  AuthenticatorEmailInputOptions<T>
>

/**
 * Input component for the headless Uploader.
 *
 * An email `input` designed to work with `Authenticator.Form`. Any passed props will
 * be passed along to the `input` component.
 */
export const AuthenticatorEmailInput: Component<AuthenticatorEmailInputProps> =
  createComponent((props) => {
    const [{ email }, { setEmail }] = useAuthenticator()
    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
    }, [])
    return createElement('input', {
      ...props,
      type: 'email',
      value: email,
      onChange,
    })
  })

export type AuthenticatorCancelButtonOptions<T extends As = 'button'> =
  Options<T>
export type AuthenticatorCancelButtonProps<T extends As = 'button'> = Props<
  AuthenticatorCancelButtonOptions<T>
>

/**
 * A button that will cancel login.
 *
 * A `button` designed to work with `Authenticator.Form`. Any passed props will
 * be passed along to the `button` component.
 */
export const AuthenticatorCancelButton: Component<AuthenticatorCancelButtonProps> =
  createComponent((props) => {
    const [, { cancelLogin }] = useAuthenticator()
    return createElement('button', { ...props, onClick: cancelLogin })
  })

/**
 * Use the scoped authenticator context state from a parent `Authenticator`.
 */
export function useAuthenticator(): AuthenticatorContextValue {
  return useContext(AuthenticatorContext)
}

export const Authenticator = Object.assign(AuthenticatorRoot, {
  Form: AuthenticatorForm,
  EmailInput: AuthenticatorEmailInput,
  CancelButton: AuthenticatorCancelButton,
})
