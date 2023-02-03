import React from 'react'
import { Authenticator as AuthCore, useAuthenticator } from '@w3ui/react-keyring'

export function AuthenticationForm (): JSX.Element {
  const [{ submitted }] = useAuthenticator()

  return (
    <div className='w3ui-authenticator'>
      <AuthCore.Form className='w3ui-authenticator-form'>
        <div className='email-field'>
          <label htmlFor='w3ui-authenticator-email'>Email</label>
          <AuthCore.EmailInput id='w3ui-authenticator-email' required />
        </div>
        <button className='register w3ui-button' type='submit' disabled={submitted}>Register</button>
      </AuthCore.Form>
    </div>
  )
}

export function AuthenticationSubmitted (): JSX.Element {
  const [{ email }] = useAuthenticator()

  return (
    <div className='w3ui-authenticator'>
      <div className='w3ui-authenticator-verify-email'>
        <h1 className='message'>Verify your email address!</h1>
        <p className='detail'>Click the link in the email we sent to {email} to sign in.</p>
        <AuthCore.CancelButton className='cancel w3ui-button'>
          Cancel
        </AuthCore.CancelButton>
      </div>
    </div>
  )
}

export function AuthenticationEnsurer ({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element {
  const [{ spaces, submitted }] = useAuthenticator()
  const registered = Boolean(spaces.some(s => s.registered()))
  if (registered) {
    return <>{children}</>
  }
  if (submitted) {
    return <AuthenticationSubmitted />
  }
  return <AuthenticationForm />
}

interface AuthenticatorProps {
  children: JSX.Element | JSX.Element[]
  className?: string
}

export function Authenticator ({ children, className = '' }: AuthenticatorProps): JSX.Element {
  return (
    <AuthCore as='div' className={className}>
      <AuthenticationEnsurer>
        {children}
      </AuthenticationEnsurer>
    </AuthCore>
  )
}

/**
 * Wrapping a component with this HoC ensures an identity exists.
 */
export function withIdentity<C extends React.JSXElementConstructor<P>, P> (Component: C) {
  return (props: any) => (
    <Authenticator>
      <Component {...props} />
    </Authenticator>
  )
}
