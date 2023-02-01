import type { ChangeEvent } from 'react'

import React, { useState } from 'react'
import { useKeyring } from '@w3ui/react-keyring'
import { ArrowPathIcon } from '@heroicons/react/20/solid'

export function SpaceCreatorCreating (): JSX.Element {
  return (
    <div className='w3ui-space-creator-creating'>
      <h5>Creating Space...</h5>
      <ArrowPathIcon className='w3ui-space-creator-creating-icon' />
    </div>
  )
}

interface SpaceCreatorProps {
  className?: string
}

export function SpaceCreator ({ className = '' }: SpaceCreatorProps): JSX.Element {
  const [, { createSpace, registerSpace }] = useKeyring()
  const [creating, setCreating] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  function resetForm (): void {
    setEmail('')
    setName('')
  }

  async function onSubmit (e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitted(true)
    try {
      await createSpace(name)
      // ignore this because the Space UI should handle helping the user recover
      // from space registration failure
      void registerSpace(email)
    } catch (err) {
      console.log(err)
      throw new Error('failed to register', { cause: err })
    } finally {
      resetForm()
      setSubmitted(false)
    }
  }
  return (
    <div className={`w3ui-space-creator ${className}`}>
      {(creating)
        ? submitted
          ? (
            <SpaceCreatorCreating />
            )
          : (
            <form
              className='w3ui-space-creator-form'
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => { void onSubmit(e) }}
            >
              <input
                className='w3ui-space-creator-email'
                type='email' placeholder='Email'
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value) }}
              />
              <input
                className='w3ui-space-creator-name'
                placeholder='Name'
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value) }}
              />
              <input type='submit' className='w3ui-button w3ui-space-creator-submit' value='Create' />
            </form>
            )
        : (
          <button className='w3ui-button w3ui-space-creator-add' onClick={() => setCreating(true)}>
            Add Space
          </button>
          )}
    </div>
  )
}
