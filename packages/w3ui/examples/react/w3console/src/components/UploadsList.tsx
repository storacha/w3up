import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/20/solid'
import type { UploadListResult } from '@w3ui/uploads-list-core'
import { UploadsList as UploadsListCore } from '@w3ui/react-uploads-list'
import { gatewayHost } from '../components/services'

interface UploadsProps {
  uploads?: UploadListResult[]
  loading: boolean
}

function Uploads ({ uploads, loading }: UploadsProps): JSX.Element {
  return uploads === undefined || uploads.length === 0
    ? (
      <>
        <div className='text-zinc-300'>No uploads</div>
        <nav className='flex flex-row justify-center'>
          <UploadsListCore.ReloadButton className='w3ui-button'>
            <ArrowPathIcon className={`h-6 w-6  ${loading ? 'animate-spin' : ''}`}/>
          </UploadsListCore.ReloadButton>
        </nav>
      </>
      )
    : (
      <>
        <div className='rounded-md border border-zinc-300'>
          <table className='border-collapse table-fixed w-full divide-y divide-zinc-300'>
            <thead className='text-left text-sm text-zinc-300'>
              <tr>
                <th className="p-3">Root CID</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map(({ root }) => (
                <tr key={root.toString()}>
                  <td className="p-2 pl-3 font-mono text-sm overflow-hidden no-wrap text-ellipsis">
                    <a href={`https://${root.toString()}.ipfs.${gatewayHost}/`}>
                      {root.toString()}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav className='flex flex-row justify-center space-x-4 my-4'>
          <UploadsListCore.PrevButton className='w3ui-button'>
            <ChevronLeftIcon className='h-6 w-6'/>
          </UploadsListCore.PrevButton>
          <UploadsListCore.ReloadButton className='w3ui-button'>
            <ArrowPathIcon className={`h-6 w-6  ${loading ? 'animate-spin' : ''}`}/>
          </UploadsListCore.ReloadButton>
          <UploadsListCore.NextButton className='w3ui-button'>
            <ChevronRightIcon className='h-6 w-6'/>
          </UploadsListCore.NextButton>
        </nav>
      </>
      )
}

export const UploadsList = (): JSX.Element => {
  return (
    <UploadsListCore>
      {(props) => (
        <div className='mb-5'>
          <Uploads uploads={props.uploadsList?.[0].data} loading={props.uploadsList?.[0].loading ?? false}/>
        </div>
      )}
    </UploadsListCore>
  )
}
