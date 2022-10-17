import React from 'react'
import { AuthProvider } from '@w3ui/react-keyring'
import ContentPage from './ContentPage'
import logo from './logo.png'

function App () {
  return (
    <AuthProvider>
      <div className='vh-100 flex flex-column justify-center items-center sans-serif light-silver'>
        <header>
          <img src={logo} width='250' alt='logo' />
        </header>
        <div className='w-90 w-50-ns mw6'>
          <ContentPage />
        </div>
      </div>
    </AuthProvider>
  )
}

export default App
