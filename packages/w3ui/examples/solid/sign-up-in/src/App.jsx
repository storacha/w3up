import logo from './logo.png'
import { AuthProvider } from '@w3ui/solid-wallet'
import ContentPage from './ContentPage'

function App () {
  return (
    <AuthProvider>
      <div className='vh-100 flex flex-column justify-center items-center sans-serif'>
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
