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

export function SpaceFinder ({ spaces, selected, setSelected, className }: SpaceFinderProps): JSX.Element {
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
    <div className={className}>
      <Combobox value={selected} onChange={setSelected} by={(a, b) => a.sameAs(b)}>
        <div className='relative mt-1'>
          <div className='relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm'>
            <Combobox.Input
              className='w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 text-black'
              displayValue={(space: Space) => space.name() ?? space.did()}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
              <ChevronUpDownIcon
                className='h-5 w-5 text-gray-400'
                aria-hidden='true'
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className='absolute mt-1 max-h-44 w-full bg-white overflow-auto rounded-md py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm' static>
              {filtered.length === 0 && query !== ''
                ? (
                  <div className='relative cursor-default select-none py-2 px-4 font-mono text-xs text-red-500'>
                    (╯°□°)╯︵ ┻━┻
                  </div>
                  )
                : (
                    filtered.map((space) => (
                      <Combobox.Option
                        key={space.did()}
                        className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-teal-600 text-white' : 'text-gray-900'
                      }`}
                        value={space}
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                            >
                              {space.name() ?? space.did()}
                            </span>
                            {selected
                              ? (
                                <span
                                  className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-teal-600'
                            }`}
                                >
                                  <CheckIcon className='h-5 w-5' aria-hidden='true' />
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
