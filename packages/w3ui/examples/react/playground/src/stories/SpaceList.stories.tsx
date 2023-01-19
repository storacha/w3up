import type { DID } from '@ucanto/interface'
import type { KeyringContextValue } from '@w3ui/react-keyring'

import React from 'react'
import { SpaceList } from '@w3ui/react'
import { Space } from '@w3ui/keyring-core'
import { KeyringContext, keyringContextDefaultValue } from '@w3ui/react-keyring'

function contextValue (state = {}, actions = {}): KeyringContextValue {
  return [
    { ...keyringContextDefaultValue[0], ...state },
    { ...keyringContextDefaultValue[1], ...actions }
  ]
}

function WrappedSpaceList ({ spaceDIDs = [], setCurrentSpace }: { spaceDIDs: DID[], setCurrentSpace: any }): JSX.Element {
  const spaces = spaceDIDs.map(did => new Space(did, {}))
  return (
    <KeyringContext.Provider value={contextValue({ spaces }, { setCurrentSpace })}>
      <SpaceList />
    </KeyringContext.Provider>
  )
}

export default {
  title: 'w3ui/SpaceList',
  component: WrappedSpaceList,
  tags: ['autodocs'],
  argTypes: {
    setCurrentSpace: { action: 'set space' }
  }
}

export const Primary = {
  args: {
    spaceDIDs: ['did:example:abc123']
  }
}
