import { createSignal, Switch, Match } from 'solid-js'
import { useAuth, AuthStatus } from '@w3ui/solid-keyring'

function Authenticator ({ children }) {
  const [auth, { registerAndStoreIdentity, cancelRegisterAndStoreIdentity }] = useAuth()
  const [email, setEmail] = createSignal('')
  const [submitted, setSubmitted] = createSignal(false)

  const handleRegisterSubmit = async e => {
    e.preventDefault()
    setSubmitted(true)
    try {
      await registerAndStoreIdentity(email())
    } catch (err) {
      throw new Error('failed to register', { cause: err })
    } finally {
      setSubmitted(false)
    }
  }

  return (
    <Switch>
      <Match when={auth.status === AuthStatus.SignedIn}>
        {children}
      </Match>
      <Match when={auth.status === AuthStatus.EmailVerification}>
        <div className='w-90 w-50-ns mw6'>
          <h1>Verify your email address!</h1>
          <p>Click the link in the email we sent to {auth.identity.email} to sign in.</p>
          <form onSubmit={e => { e.preventDefault(); cancelRegisterAndStoreIdentity() }}>
            <button type='submit' className='ph3 pv2'>Cancel</button>
          </form>
        </div>
      </Match>
      <Match when={auth.status === AuthStatus.SignedOut}>
        <form className='w-90 w-50-ns mw6' onSubmit={handleRegisterSubmit}>
          <div className='mb3'>
            <label htmlFor='email' className='db mb2'>Email address:</label>
            <input id='email' className='db pa2 w-100' type='email' value={email()} onInput={e => setEmail(e.target.value)} required />
          </div>
          <button type='submit' className='ph3 pv2' disabled={submitted()}>Register</button>
        </form>
      </Match>
    </Switch>
  )
}

export default Authenticator

/**
 * Wrapping a component with this HoC ensures an identity exists.
 */
export function withIdentity (Component) {
  return props => (
    <Authenticator>
      <Component {...props} />
    </Authenticator>
  )
}
