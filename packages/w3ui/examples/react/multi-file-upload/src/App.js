import React, { useEffect } from 'react'
import { AuthProvider, useAuth } from '@w3ui/react-wallet'
import { UploaderProvider } from '@w3ui/react-uploader'
import ContentPage from './ContentPage'
import logo from './logo.png'

function App () {
  return (
    <AuthProvider>
      <UploaderProvider>
        <IdentityLoader>
          <div className='vh-100 flex flex-column justify-center items-center sans-serif'>
            <header className='mb3'>
              <img src={logo} width='125' alt='logo' />
            </header>
            <ContentPage />
          </div>
        </IdentityLoader>
      </UploaderProvider>
    </AuthProvider>
  )
}

function IdentityLoader ({ children }) {
  const { loadDefaultIdentity } = useAuth()
  // eslint-disable-next-line
  useEffect(() => { loadDefaultIdentity() }, []) // try load default identity - once.
  return children
}

export default App
