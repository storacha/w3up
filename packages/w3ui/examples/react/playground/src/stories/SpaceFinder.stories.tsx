import React from 'react'
import type { DID } from '@ucanto/interface'
import { SpaceFinder } from '@w3ui/react'
import { Space } from '@w3ui/keyring-core'
import '@w3ui/react/src/styles/space-finder.css'

export default {
  title: 'w3ui/SpaceFinder',
  component: SpaceFinder,
  tags: ['autodocs'],
  argTypes: {
    setSelected: { action: 'set space' },
  },
}

const spaces = [
  'did:example:abc123',
  'did:example:xyz789',
  'did:example:lmn456',
].map((did: string, i) => new Space(did as DID, { name: `Space ${i}` }))

export const Primary = {
  args: {
    spaces,
    selected: spaces[0],
  },
  decorators: [
    (Story) => (
      <div style={{ margin: '3em' }}>
        <Story />
      </div>
    ),
  ],
}
