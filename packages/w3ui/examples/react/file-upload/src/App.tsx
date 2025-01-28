import { Authenticator, Provider, Uploader } from '@w3ui/react'
import { AuthenticationEnsurer, SpaceEnsurer, UploaderForm } from '@w3ui/example-react-components'
import React from 'react'

function App () {
  return (
    <div className='bg-grad flex flex-col items-center h-screen'>
      <Provider>
        <Authenticator>
          <AuthenticationEnsurer>
            <SpaceEnsurer>
              <Uploader>
                <UploaderForm />
              </Uploader>
            </SpaceEnsurer>
          </AuthenticationEnsurer>
        </Authenticator>
      </Provider>
    </div>
  )
}

export default App
