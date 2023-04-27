
import { useState } from 'react'
import { DIDKey } from '@ucanto/interface'
import { useKeyring } from '@w3ui/react-keyring'

import { AuthenticationEnsurer } from '../components/Authenticator'
import { DefaultLayout } from '../components/Layout'
import { SpaceEnsurer } from '../components/SpaceEnsurer'
import { SpaceSection } from '../components/SpaceSection'
import { SpaceSelector } from './SpaceSelector'

export default function Home (): JSX.Element {
  const [share, setShare] = useState(false)
  const [{ space, spaces }, { setCurrentSpace }] = useKeyring()

  function viewSpace (did: DIDKey): void {
    setShare(false)
    void setCurrentSpace(did)
  }

  return (
    <AuthenticationEnsurer>
      <SpaceEnsurer>
        <DefaultLayout sidebar={
          <div class='flex-grow flex flex-col justify-between'>
            <SpaceSelector
              selected={space}
              setSelected={viewSpace}
              spaces={spaces}
            />
          </div>
        }>
          <SpaceSection viewSpace={viewSpace} share={share} setShare={setShare} />
        </DefaultLayout>
      </SpaceEnsurer>
    </AuthenticationEnsurer>
  )
}

