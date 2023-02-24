import { ChangeEvent, useState } from 'react'
import { useKeyring } from '@w3ui/react-keyring'
import * as DID from '@ipld/dag-ucan/did'
import { CarWriter } from '@ipld/car/writer'
import { CarReader } from '@ipld/car/reader'
import { importDAG } from '@ucanto/core/delegation'
import type { PropsWithChildren } from 'react'
import type { Delegation, DIDKey } from '@ucanto/interface'
import { DidIcon } from './components/DidIcon'

function Header(props: PropsWithChildren): JSX.Element {
  return (
    <h3 className='font-semibold text-xs font-mono uppercase tracking-wider mb-4 text-gray-400'>
      {props.children}
    </h3>
  )
}

export async function toCarBlob(delegation: Delegation): Promise<Blob> {
  const { writer, out } = CarWriter.create()
  for (const block of delegation.export()) {
    // @ts-expect-error
    void writer.put(block)
  }
  void writer.close()

  const carParts = []
  for await (const chunk of out) {
    carParts.push(chunk)
  }
  const car = new Blob(carParts, {
    type: 'application/vnd.ipld.car',
  })
  return car
}

export async function toDelegation(car: Blob): Promise<Delegation> {
  const blocks = []
  const bytes = new Uint8Array(await car.arrayBuffer())
  const reader = await CarReader.fromBytes(bytes)
  for await (const block of reader.blocks()) {
    blocks.push(block)
  }
  return importDAG(blocks)
}

export function SpaceShare({
  viewSpace,
}: {
  viewSpace: (did: DIDKey) => void
}): JSX.Element {
  const [{ agent }, { createDelegation, addSpace }] = useKeyring()
  const [value, setValue] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [proof, setProof] = useState<Delegation>()

  async function makeDownloadLink(input: string): Promise<void> {
    let audience
    try {
      audience = DID.parse(input.trim())
    } catch (err) {
      setDownloadUrl('')
      return
    }

    try {
      const delegation = await createDelegation(audience, ['*'], {
        expiration: Infinity,
      })
      const blob = await toCarBlob(delegation)
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
    } catch (err) {
      throw new Error('failed to register', { cause: err })
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    void makeDownloadLink(value)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const input = e.target.value
    void makeDownloadLink(input)
    setValue(input)
  }

  function downloadName(ready: boolean, inputDid: string): string {
    if (!ready || inputDid === '') return ''
    const [, method = '', id = ''] = inputDid.split(':')
    return `did-${method}-${id?.substring(0, 10)}.ucan`
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = e.target.files?.[0]
    if (input === undefined) return
    let delegation
    try {
      delegation = await toDelegation(input)
    } catch (err) {
      console.log(err)
      return
    }
    try {
      await addSpace(delegation)
      setProof(delegation)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className='pt-12'>
      <div className=''>
        <Header>Share your space</Header>
        <p className='mb-4'>
          Ask your friend for their Decentralized Identifier (DID) and paste it
          in below
        </p>
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            void onSubmit(e)
          }}
        >
          <input
            className='text-black px-2 py-2 rounded block mb-4 w-full max-w-4xl font-mono text-sm'
            type='pattern'
            pattern='did:.+'
            placeholder='did:'
            value={value}
            onChange={onChange}
          />
          <a
            className='w3ui-button text-center block w-52'
            style={{ opacity: downloadUrl !== '' ? '1' : '0.2' }}
            href={downloadUrl ?? ''}
            download={downloadName(downloadUrl !== '', value)}
          >
            Download UCAN
          </a>
        </form>
      </div>
      <div className='mt-16 py-16 border-t border-gray-700'>
        <Header>Import a space</Header>
        <p className='mb-2'>Copy and paste your DID to your friend</p>
        <div className='bg-opacity-10 bg-white font-mono text-sm py-2 px-3 rounded break-words max-w-4xl'>
          {agent?.did()}
        </div>
        <div className='mt-8'>
          <label className='w3ui-button text-center block w-52'>
            Import UCAN
            <input
              type='file'
              accept='.ucan,.car,application/vnd.ipfs.car'
              className='hidden'
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                void onImport(e)
              }}
            />
          </label>
        </div>
        {proof !== undefined && (
          <div className='mt-4 pt-4'>
            <Header>Added</Header>
            <div className='max-w-3xl border border-gray-700 shadow-xl'>
              {proof.capabilities.map((cap, i) => (
                <figure className='p-4 flex flex-row items-start gap-2' key={i}>
                  <DidIcon did={cap.with} />
                  <figcaption className='grow'>
                    <a
                      href='#'
                      onClick={() => viewSpace(cap.with)}
                      className='block'
                    >
                      <span className='block text-xl font-semibold leading-5 mb-1'>
                        {proof.facts.at(i)?.space.name ?? 'Untitled Space'}
                      </span>
                      <span className='block font-mono text-xs text-gray-500 truncate'>
                        {cap.with}
                      </span>
                    </a>
                  </figcaption>
                  <div>
                    <a
                      href='#'
                      className='font-sm font-semibold align-[-8px]'
                      onClick={() => viewSpace(cap.with)}
                    >
                      View
                    </a>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
