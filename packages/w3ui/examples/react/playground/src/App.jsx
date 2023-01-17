import logo from './logo.png'
import ContentPage from './ContentPage'
import { KeyringProvider } from '@w3ui/react-keyring'

function App () {
  return (
    <main>
      <header style={{ textAlign: 'center', padding: 10 }}>
        <img src={logo} width='250' alt='logo' />
      </header>
      <KeyringProvider>
        <ContentPage />
      </KeyringProvider>
    </main>
  )
}

export default App
