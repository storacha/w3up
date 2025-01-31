import {
  Authenticator,
  Provider,
  Uploader,
  useW3,
  UploadListSuccess,
} from '@w3ui/react'
import {
  AuthenticationEnsurer,
  Loader,
  SpaceEnsurer,
  UploaderForm,
} from '@w3ui/example-react-components'
import useSWR from 'swr'

interface PageProps {
  searchParams?: {
    cursor?: string
    pre?: string
  }
}

function Uploads({
  searchParams = { cursor: '', pre: 'false' },
}: PageProps): React.ReactElement {
  const [{ client, spaces }] = useW3()
  const spaceDID = client?.currentSpace()?.did()
  const space = spaces.find((s) => s.did() === spaceDID)

  const key =
    spaceDID !== undefined &&
    `/space/${spaceDID}/uploads?cursor=${searchParams.cursor ?? ''}&pre=${
      searchParams.pre ?? 'false'
    }`
  const {
    data: uploads,
    isLoading,
    mutate,
  } = useSWR<UploadListSuccess | undefined>(key, {
    fetcher: async () => {
      if (client == null || space == null) return

      if (client.currentSpace()?.did() !== space.did()) {
        await client.setCurrentSpace(space.did())
      }

      return await client.capability.upload.list({
        cursor: searchParams.cursor,
        pre: searchParams.pre === 'true',
        size: 10,
      })
    },
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error(err.message, err.cause)
    },
    keepPreviousData: true,
  })
  if (isLoading) {
    return <Loader />
  }
  return (
    <>
      <Uploader
        onUploadComplete={() => {
          void mutate()
        }}
      >
        <UploaderForm />
      </Uploader>
      <div className="flex flex-col">
        <h3 className="bold text-xl mb-4">Uploads</h3>
        {uploads?.results.map((upload, i) => (
          <div key={i}>
            <a href={`https://${upload.root.toString()}.ipfs.w3s.link`}>
              {upload.root.toString()}
            </a>
          </div>
        ))}
      </div>
    </>
  )
}

function App(): React.ReactElement {
  return (
    <div className="bg-grad flex flex-col items-center h-screen">
      <Provider>
        <Authenticator>
          <AuthenticationEnsurer>
            <SpaceEnsurer>
              <Uploads />
            </SpaceEnsurer>
          </AuthenticationEnsurer>
        </Authenticator>
      </Provider>
    </div>
  )
}

export default App
