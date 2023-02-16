import type { Space } from '@w3ui/keyring-core'

import React, { Fragment, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

interface SpaceFinderProps {
  spaces: Space[]
  selected?: Space
  setSelected?: (space: Space) => void
  className?: string
}

export function SpaceFinder ({
  spaces,
  selected,
  setSelected,
  className = ''
}: SpaceFinderProps): JSX.Element {
  const [query, setQuery] = useState('')
  const filtered =
    query === ''
      ? spaces
      : spaces.filter((space: Space) =>
        (space.name() ?? space.did())
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.toLowerCase().replace(/\s+/g, ''))
      )

  return (
    <div className={`${className} w3ui-space-finder`}>
      <Combobox
        value={selected}
        onChange={setSelected}
        by={(a, b) => a.sameAs(b)}
      >
        <div className='w3ui-space-finder-contents'>
          <div className='w3ui-space-finder-closed'>
            <Combobox.Input
              className='w3ui-space-finder-combobox-input'
              displayValue={(space: Space) => space.name() ?? space.did()}
              onChange={(event) => { setQuery(event.target.value) }}
            />
            <Combobox.Button className='w3ui-space-finder-combobox-button'>
              <ChevronUpDownIcon
                className='w3ui-space-finder-combobox-icon'
                aria-hidden='true'
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
            afterLeave={() => { setQuery('') }}
          >
            <Combobox.Options
              className='w3ui-space-finder-combobox-options'
              static
            >
              {filtered.length === 0 && query !== ''
                ? (
                <div className='w3ui-space-finder-combobox-no-results'>
                  (╯°□°)╯︵ ┻━┻
                </div>
                  )
                : (
                    filtered.map((space) => (
                  <Combobox.Option
                    key={space.did()}
                    className={({ active }) =>
                      `w3ui-space-finder-combobox-option ${
                        active ? 'active' : ''
                      }`
                    }
                    value={space}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`w3ui-space-finder-combobox-option-space-name ${
                            selected ? 'selected' : ''
                          }`}
                        >
                          {space.name() ?? space.did()}
                        </span>
                        {selected
                          ? (
                          <span
                            className={`w3ui-space-finder-combobox-option-selected-icon-wrapper ${
                              active ? 'active' : ''
                            }`}
                          >
                            <CheckIcon
                              className='w3ui-space-finder-combobox-option-selected-icon'
                              aria-hidden='true'
                            />
                          </span>
                            )
                          : null}
                      </>
                    )}
                  </Combobox.Option>
                    ))
                  )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  )
}
