import type { Space } from '@w3ui/keyring-core'

import React from 'react'
import { useKeyring } from '@w3ui/react-keyring'

export function SpaceList (props: any): JSX.Element {
  const [{ space: currentSpace, spaces }, { setCurrentSpace }] = useKeyring()
  async function selectSpace (space: Space): Promise<void> {
    await setCurrentSpace(space.did())
  }
  return (
    <ul {...props}>
      {spaces.map((space, i) => (
        <li key={space.did()} className={`hover:font-bold ${space.sameAs(currentSpace) ? 'font-bold' : ''}`}>
          <button onClick={() => { void selectSpace(space) }}>
            {space.name() ?? `Space ${i + 1}`}
          </button>
        </li>
      ))}
    </ul>
  )
}
