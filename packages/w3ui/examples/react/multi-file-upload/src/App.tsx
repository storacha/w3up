import {
  Authenticator,
  Provider,
  Uploader,
  WrapInDirectoryCheckbox,
  useUploader,
} from '@storacha/ui-react'
import {
  AuthenticationEnsurer,
  SpaceEnsurer,
  UploaderForm,
} from '@storacha/ui-example-react-components'
import { useState } from 'react'

function Options({
  allowDirectory,
  setAllowDirectory,
}: {
  allowDirectory: boolean
  setAllowDirectory: (allowDirectory: boolean) => void
}): React.ReactElement {
  const [{ files }] = useUploader()
  return (
    <div className="flex flex-col">
      {files?.length === 1 && (
        <label className="flex space-x-2">
          <WrapInDirectoryCheckbox />
          <span>Wrap in directory?</span>
        </label>
      )}
      <label className="flex space-x-2">
        <input
          type="checkbox"
          checked={allowDirectory}
          onChange={(e) => {
            setAllowDirectory(e.target.checked)
          }}
        />
        <span>Allow directory selection?</span>
      </label>
    </div>
  )
}

function App(): React.ReactElement {
  const [allowDirectory, setAllowDirectory] = useState(false)
  return (
    <div className="bg-grad flex flex-col items-center h-screen">
      <Provider>
        <Authenticator>
          <AuthenticationEnsurer>
            <SpaceEnsurer>
              <Uploader>
                <UploaderForm multiple allowDirectory={allowDirectory} />
                <Options
                  allowDirectory={allowDirectory}
                  setAllowDirectory={setAllowDirectory}
                />
              </Uploader>
            </SpaceEnsurer>
          </AuthenticationEnsurer>
        </Authenticator>
      </Provider>
    </div>
  )
}

export default App
