import type { ChangeEvent } from 'react'

import React, { useState } from 'react'
import { useKeyring } from '@w3ui/react-keyring'
import { ArrowPathIcon } from '@heroicons/react/20/solid'
import Loader from '../components/Loader'

export function SpaceCreatorCreating (): JSX.Element {
  return (
    <div className='flex flex-col items-center space-y-4'>
      <h5>Creating Space...</h5>
      <Loader className='w-6' />
    </div>
  )
}

interface SpaceCreatorFormProps {
  className?: string
}

export function SpaceCreatorForm ({
  className = ''
}: SpaceCreatorFormProps): JSX.Element {
  const [{ account }, { createSpace, registerSpace }] = useKeyring()
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')

  function resetForm (): void {
    setName('')
  }

  async function onSubmit (e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (account) {
      setSubmitted(true)
      try {
        await createSpace(name)
        await registerSpace(account, { provider: import.meta.env.VITE_W3UP_PROVIDER })
      } catch (error) {
        /* eslint-disable no-console */
        console.error(error)
        /* eslint-enable no-console */
        throw new Error('failed to register', { cause: error })
      } finally {
        resetForm()
        setSubmitted(false)
      }
    } else {
      throw new Error('cannot create space, no account found, have you authorized your email?')
    }
  }
  return (
    <div className={className}>
      {
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
      }
    </div>
  )
}

interface SpaceCreatorProps {
  className?: string
}

export function SpaceCreator ({
  className = ''
}: SpaceCreatorProps): JSX.Element {
  const [creating, setCreating] = useState(false)

  return (
    <div className={`${className}`}>
      {creating
        ? (
          <SpaceCreatorForm />
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
