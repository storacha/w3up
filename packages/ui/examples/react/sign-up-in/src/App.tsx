import { Authenticator, Provider, useW3 } from '@storacha/ui-react'
import { AuthenticationEnsurer } from '@storacha/ui-example-react-components'

function Identity() {
  const [{ client, accounts }] = useW3()
  return (
    <div className="m-12">
      <p className="mb-6">
        You&apos;re signed in as <b>{accounts[0]?.toEmail()}</b>.
      </p>
      <p>Your local agent&apos;s DID is</p>
      <p className="max-w-xl overflow-hidden text-ellipsis">
        {client?.agent.did()}
      </p>
    </div>
  )
}

function App() {
  return (
    <div className="bg-grad flex flex-col items-center h-screen">
      <Provider>
        <Authenticator>
          <AuthenticationEnsurer>
            <Identity />
          </AuthenticationEnsurer>
        </Authenticator>
      </Provider>
    </div>
  )
}

export default App
