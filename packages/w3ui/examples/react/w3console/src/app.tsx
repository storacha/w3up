import { ChangeEvent, useEffect, useState } from 'react'
import type { Space } from '@w3ui/keyring-core'

import { Authenticator, Uploader, UploadsList, W3APIProvider, SpaceFinder } from '@w3ui/react'
import { useKeyring } from '@w3ui/react-keyring'
import { useUploadsList } from '@w3ui/react-uploads-list'
import md5 from 'blueimp-md5'
import '@w3ui/react/src/styles/uploader.css'

function SpaceRegistrar (): JSX.Element {
  const [, { registerSpace }] = useKeyring()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  async function onSubmit (e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitted(true)
    try {
      await registerSpace(email)
    } catch (err) {
      console.log(err)
      throw new Error('failed to register', { cause: err })
    } finally {
      setSubmitted(false)
    }
  }
  return (
    <div>
      {submitted
        ? (
          <p>
            Please check your email for a verification email.
          </p>
          )
        : (
          <>
            <p>
              Before you upload files, you must register this space.
            </p>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { void onSubmit(e) }}>
              <input
                type='email' placeholder='Email' autofocus
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value) }}
              />
              <input
                type='submit' className='w3ui-button' value='Register'
                disabled={email === ''}
              />
            </form>
          </>
          )}
    </div>
  )
}

function SpaceSection (): JSX.Element {
  const [{ space }] = useKeyring()
  const [, { reload }] = useUploadsList()
  // reload the uploads list when the space changes
  // TODO: this currently does a network request - we'd like to just reset
  // to the latest state we have and revalidate in the background (SWR)
  // but it's not clear how all that state should work yet - perhaps
  // we need some sort of state management primitive in the uploads list?
  useEffect(() => { void reload() }, [space])
  const registered = Boolean(space?.registered())
  return (
    <div>
      <header className='py-3'>
        {(space !== undefined) && (
          <div className='flex flex-row items-start gap-2'>
            <img title={space.did()} src={`https://www.gravatar.com/avatar/${md5(space.did())}?d=identicon`} className='w-10 hover:saturate-200 saturate-0 invert border-solid border-gray-500 border' />
            <div>
              <h1 className='text-xl font-semibold leading-5'>{space.name() ?? 'Untitled'}</h1>
              <label className='font-mono text-xs text-gray-500'>{space.did()}</label>
            </div>
          </div>
        )}

      </header>
      <div className='container mx-auto'>
        {registered
          ? (
            <>
              <Uploader onUploadComplete={() => { void reload() }} />
              <div className='mt-8'>
                <UploadsList />
              </div>
            </>
            )
          : (
            <SpaceRegistrar />
            )}
      </div>
    </div>
  )
}

function SpaceCreator (props: any): JSX.Element {
  const [, { createSpace, registerSpace }] = useKeyring()
  const [creating, setCreating] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  async function onSubmit (e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitted(true)
    try {
      await createSpace(name)
      await registerSpace(email)
    } catch (err) {
      console.log(err)
      throw new Error('failed to register', { cause: err })
    } finally {
      setSubmitted(false)
    }
  }
  return (
    <div {...props}>
      {(creating)
        ? (
          <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { void onSubmit(e) }}>
            <input
              className='text-black'
              type='email' placeholder='Email' autofocus
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value) }}
            />
            <input
              className='text-black'
              placeholder='Name'
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value) }}
            />
            <input type='submit' className='w3ui-button' value='Create' />
          </form>
          )
        : submitted
          ? (
            <div>creating space...</div>
            )
          : (
            <button className='w3ui-button py-2' onClick={() => setCreating(true)}>
              Add Space
            </button>
            )}
    </div>
  )
}

function SpaceSelector (props: any): JSX.Element {
  const [{ space: currentSpace, spaces }, { setCurrentSpace }] = useKeyring()
  async function selectSpace (space: Space): Promise<void> {
    await setCurrentSpace(space.did())
  }
  return (
    <div>
      <h3 className='text-xs tracking-wider uppercase font-bold my-2 text-gray-400 font-mono'>Spaces</h3>
      <SpaceFinder spaces={spaces} selected={currentSpace} setSelected={(space: Space) => { void selectSpace(space) }} />
    </div>
  )
}

export function Logo (): JSX.Element {
  return (
    <h1 className='font-bold flex flex-row justify-center items-center gap-2'>
      <svg className='site-logo-image text-white' width='30' viewBox='0 0 27.2 27.18' xmlns='http://www.w3.org/2000/svg'><path d='M13.6 27.18A13.59 13.59 0 1127.2 13.6a13.61 13.61 0 01-13.6 13.58zM13.6 2a11.59 11.59 0 1011.6 11.6A11.62 11.62 0 0013.6 2z' fill='currentColor' /><path d='M12.82 9.9v2.53h1.6V9.9l2.09 1.21.77-1.21-2.16-1.32 2.16-1.32-.77-1.21-2.09 1.21V4.73h-1.6v2.53l-2-1.21L10 7.26l2.2 1.32L10 9.9l.78 1.21zM18 17.79v2.52h1.56v-2.52L21.63 19l.78-1.2-2.16-1.33 2.16-1.28-.78-1.19-2.08 1.2v-2.58H18v2.56L15.9 14l-.77 1.2 2.16 1.32-2.16 1.33.77 1.15zM8.13 17.79v2.52h1.56v-2.52L11.82 19l.77-1.2-2.16-1.33 2.12-1.28-.73-1.24-2.13 1.23v-2.56H8.13v2.56L6.05 14l-.78 1.2 2.16 1.3-2.16 1.33.78 1.17z' fill='currentColor' /></svg>
      console
    </h1>
  )
}

export function App (): JSX.Element {
  return (
    <W3APIProvider>
      <Authenticator>
        <div className='flex min-h-full w-full'>
          <nav className='flex-none w-64 bg-gray-900 text-white px-4 pb-4 border-r border-gray-800'>
            <div className='flex flex-col justify-between min-h-full'>
              <div class='flex-none'>
                <SpaceSelector />
              </div>
              <div>
                <SpaceCreator className='mb-4' />
                <Logo />
              </div>
            </div>
          </nav>
          <main className='grow bg-dark-gray text-white p-4'>
            <SpaceSection />
          </main>
        </div>
      </Authenticator>
    </W3APIProvider>
  )
}
