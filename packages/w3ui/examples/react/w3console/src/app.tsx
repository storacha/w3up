import { Authenticator, Uploader, UploadsList, W3APIProvider } from '@w3ui/react'
import { useKeyring } from '@w3ui/react-keyring'
import { useUploadsList } from '@w3ui/react-uploads-list'
import md5 from 'blueimp-md5'
import '@w3ui/react/src/styles/uploader.css'

function Space (): JSX.Element {
  const [{ space }] = useKeyring()
  const [, { reload }] = useUploadsList()
  return (
    <div className='container mx-auto'>
      <div className='flex flex-row space-x-4 mb-4 justify-between'>
        <div className='shrink-0'>
          {(space !== undefined) && (
            <img src={`https://www.gravatar.com/avatar/${md5(space.did())}?d=identicon`} className='w-20' />
          )}
        </div>
        <Uploader onUploadComplete={() => { void reload() }} />
      </div>
      <UploadsList />
    </div>
  )
}

export function App (): JSX.Element {
  return (
    <W3APIProvider>
      <Authenticator>
        <div className='flex min-h-full w-full'>
          <nav className='flex-none w-72 bg-white p-4 border-r border-gray-200'>
            <div className='flex flex-col justify-between min-h-full'>
              <div className='grow'>
                <h1 className='font-bold pb-4 flex flex-row justify-start items-center gap-2'>
                  <svg className='site-logo-image text-black' width='30' viewBox='0 0 27.2 27.18' xmlns='http://www.w3.org/2000/svg'><path d='M13.6 27.18A13.59 13.59 0 1127.2 13.6a13.61 13.61 0 01-13.6 13.58zM13.6 2a11.59 11.59 0 1011.6 11.6A11.62 11.62 0 0013.6 2z' fill='currentColor' /><path d='M12.82 9.9v2.53h1.6V9.9l2.09 1.21.77-1.21-2.16-1.32 2.16-1.32-.77-1.21-2.09 1.21V4.73h-1.6v2.53l-2-1.21L10 7.26l2.2 1.32L10 9.9l.78 1.21zM18 17.79v2.52h1.56v-2.52L21.63 19l.78-1.2-2.16-1.33 2.16-1.28-.78-1.19-2.08 1.2v-2.58H18v2.56L15.9 14l-.77 1.2 2.16 1.32-2.16 1.33.77 1.15zM8.13 17.79v2.52h1.56v-2.52L11.82 19l.77-1.2-2.16-1.33 2.12-1.28-.73-1.24-2.13 1.23v-2.56H8.13v2.56L6.05 14l-.78 1.2 2.16 1.3-2.16 1.33.78 1.17z' fill='currentColor' /></svg>
                  console
                </h1>
              </div>
              <div className='flex-none'>
                Space selector
                <ul>
                  <li>space 1</li>
                  <li className='font-bold'>space 2</li>
                </ul>
              </div>
            </div>
          </nav>
          <main className='grow bg-gray-100 dark:bg-dark-gray p-4'>
            <Space />
          </main>
        </div>
      </Authenticator>
    </W3APIProvider>
  )
}
