import React, { useEffect } from 'react'
import { AuthProvider, useAuth } from '@w3ui/react-keyring'
import { UploadsListProvider } from '@w3ui/react-uploads-list'
import ContentPage from './ContentPage'
import logo from './logo.png'

function App () {
  return (
    <AuthProvider>
      <UploadsListProvider>
        <IdentityLoader>
          <div className='vh-100 flex flex-column justify-center items-center sans-serif light-silver'>
            <header>
              <img src={logo} width='250' alt='logo' />
            </header>
            <ContentPage />
          </div>
        </IdentityLoader>
      </UploadsListProvider>
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
