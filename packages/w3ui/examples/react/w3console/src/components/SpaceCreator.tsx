import type { ChangeEvent } from 'react'

import React, { useState } from 'react'
import { useKeyring } from '@w3ui/react-keyring'
import { ArrowPathIcon } from '@heroicons/react/20/solid'

export function SpaceCreatorCreating (): JSX.Element {
  return (
    <div className='flex flex-col items-center space-y-4'>
      <h5>Creating Space...</h5>
      <ArrowPathIcon className='animate-spin w-6' />
    </div>
  )
}

interface SpaceCreatorProps {
  className?: string
}

export function SpaceCreator ({
  className = ''
}: SpaceCreatorProps): JSX.Element {
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
    } catch (error) {
      /* eslint-disable no-console */
      console.error(error)
      /* eslint-enable no-console */
      throw new Error('failed to register', { cause: error })
    } finally {
      resetForm()
      setSubmitted(false)
    }
  }
  /* eslint-disable no-nested-ternary */
  return (
    <div className={`${className}`}>
      {creating
        ? (
            submitted
              ? (
              <SpaceCreatorCreating />
                )
              : (
              <form
                className='flex flex-col space-y-2'
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  void onSubmit(e)
                }}
              >
                <input
                  className='text-black py-1 px-2 rounded'
                  type='email'
                  placeholder='Email'
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value)
                  }}
                />
                <input
                  className='text-black py-1 px-2 rounded'
                  placeholder='Name'
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setName(e.target.value)
                  }}
                />
                <input
                  type='submit'
                  className='w3ui-button'
                  value='Create'
                />
              </form>
                )
          )
        : (
          <button
            className='w3ui-button py-2'
            onClick={() => { setCreating(true) }}
          >
            Add Space
          </button>
          )}
    </div>
  )
  /* eslint-enable no-nested-ternary */
}
