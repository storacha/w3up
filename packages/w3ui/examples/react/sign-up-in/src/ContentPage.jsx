import React, { useEffect, useState } from 'react'
import { useKeyring } from '@w3ui/react-keyring'

export default function ContentPage () {
  const [{ account }, { loadAgent, unloadAgent, authorize, cancelAuthorize }] = useKeyring()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // eslint-disable-next-line
  useEffect(() => { loadAgent() }, []) // load the agent - once.

  if (account) {
    return (
      <div>
        <h1 className='near-white'>Welcome!</h1>
        <p>You are logged in as {account}!</p>
        <form onSubmit={e => { e.preventDefault(); unloadAgent() }}>
          <button type='submit' className='ph3 pv2'>Sign Out</button>
        </form>
      </div>
    )
  }

  if (submitted) {
    return (
      <div>
        <h1 className='near-white'>Verify your email address!</h1>
        <p>Click the link in the email we sent to {email} to sign in.</p>
        <form onSubmit={e => { e.preventDefault(); cancelAuthorize() }}>
          <button type='submit' className='ph3 pv2'>Cancel</button>
        </form>
      </div>
    )
  }

  const handleAuthorizeSubmit = async e => {
    e.preventDefault()
    setSubmitted(true)
    try {
      await authorize(email)
    } catch (err) {
      throw new Error('failed to authorize', { cause: err })
    } finally {
      setSubmitted(false)
    }
  }

  return (
    <form onSubmit={handleAuthorizeSubmit}>
      <div className='mb3'>
        <label htmlFor='email' className='db mb2'>Email address:</label>
        <input id='email' className='db pa2 w-100' type='email' value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <button type='submit' className='ph3 pv2' disabled={submitted}>Authorize</button>
    </form>
  )
}
