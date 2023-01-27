import { ChangeEvent, useState } from 'react'
import { useKeyring } from '@w3ui/react-keyring'
import * as DID from '@ipld/dag-ucan/did'
import { CarWriter } from '@ipld/car/writer'
import type { PropsWithChildren } from 'react'
import type { Delegation } from '@ucanto/interface'

function Header (props: PropsWithChildren): JSX.Element {
  return <h3 className='font-semibold text-xs font-mono uppercase tracking-wider mb-4 text-gray-400'>{props.children}</h3>
}

export async function toCarBlob (delegation: Delegation): Promise<Blob> {
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
    type: 'application/vnd.ipld.car'
  })
  return car
}

export function SpaceShare (): JSX.Element {
  const [, { createDelegation }] = useKeyring()
  const [value, setValue] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  async function makeDownloadLink (input: string): Promise<void> {
    let audience
    try {
      audience = DID.parse(input.trim())
    } catch (err) {
      setDownloadUrl('')
      return
    }

    try {
      const delegation = await createDelegation(audience, ['*'], { expiration: Infinity })
      const blob = await toCarBlob(delegation)
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
    } catch (err) {
      throw new Error('failed to register', { cause: err })
    }
  }

  function onSubmit (e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    void makeDownloadLink(value)
  }

  function onChange (e: ChangeEvent<HTMLInputElement>): void {
    const input = e.target.value
    void makeDownloadLink(input)
    setValue(input)
  }

  function downloadName (ready: boolean, inputDid: string): string {
    if (!ready || inputDid === '') return ''
    const [, method = '', id = ''] = inputDid.split(':')
    return `did-${method}-${id?.substring(0, 10)}.ucan`
  }

  return (
    <div className='pt-12'>
      <div className=''>
        <Header>Share your space</Header>
        <p className='mb-4'>Ask your friend for their Decentralized Identifier (DID) and paste it in below</p>
        <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { void onSubmit(e) }}>
          <input
            className='text-black px-2 py-2 rounded block mb-4 w-full max-w-4xl font-mono text-sm'
            type='pattern' pattern='did:.+' placeholder='did:'
            value={value}
            onChange={onChange}
          />
          <a className='w3ui-button text-center block w-52 opacity-30' style={{ opacity: downloadUrl !== '' ? '1' : '0.2' }} href={downloadUrl ?? ''} download={downloadName(downloadUrl !== '', value)}>Download UCAN</a>
        </form>
      </div>
    </div>
  )
}
