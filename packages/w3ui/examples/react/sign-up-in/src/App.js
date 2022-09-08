import React from 'react'
import { AuthProvider } from '@w3ui/react-wallet'
import ContentPage from './ContentPage'
import logo from './logo.png'

function App () {
  return (
    <AuthProvider>
      <div>
        <header style={{ textAlign: 'center', padding: 10 }}>
          <img src={logo} width='125' alt='logo' />
        </header>
        <ContentPage />
      </div>
    </AuthProvider>
  )
}

export default App
