import logo from './logo.png'
import { KeyringProvider, useKeyring } from '@w3ui/solid-keyring'
import { UploaderProvider } from '@w3ui/solid-uploader'
import ContentPage from './ContentPage'

function App () {
  return (
    <KeyringProvider>
      <UploaderProvider>
        <IdentityLoader>
          <div className='vh-100 flex flex-column justify-center items-center sans-serif light-silver'>
            <header>
              <img src={logo} width='250' alt='logo' />
            </header>
            <div className='w-90 w-50-ns mw6'>
              <ContentPage />
            </div>
          </div>
        </IdentityLoader>
      </UploaderProvider>
    </KeyringProvider>
  )
}

function IdentityLoader ({ children }) {
  const [, { loadAgent }] = useKeyring()
  loadAgent() // try load default identity - once.
  return children
}

export default App
