import React from 'react'
import { AuthProvider } from '@w3ui/react-wallet'
import ContentPage from './ContentPage'
import logo from './logo.png'

function App () {
  return (
    <AuthProvider>
      <div className='vh-100 flex flex-column justify-center items-center sans-serif'>
        <header className='mb3'>
          <img src={logo} width='125' alt='logo' />
        </header>
        <ContentPage />
      </div>
    </AuthProvider>
  )
}

export default App
