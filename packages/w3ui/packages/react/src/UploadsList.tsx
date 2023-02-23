import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/20/solid'
import type { UploadListResult } from '@w3ui/uploads-list-core'
import { UploadsList as UploadsListCore } from '@w3ui/react-uploads-list'

interface UploadsProps {
  uploads?: UploadListResult[]
  loading: boolean
}

function Uploads ({ uploads, loading }: UploadsProps): JSX.Element {
  return uploads === undefined || uploads.length === 0
    ? (
      <>
        <div className='w3-uploads-list-no-uploads'>No uploads</div>
        <nav className='flex flex-row justify-center'>
          <UploadsListCore.ReloadButton className='reload w3ui-button w-auto px-2'>
            <ArrowPathIcon className={`h-6 w-6  ${loading ? 'animate-spin' : ''}`}/>
          </UploadsListCore.ReloadButton>
        </nav>
      </>
      )
    : (
      <>
        <div className='w3-uploads-list-data'>
          <table>
            <thead>
              <tr>
                <th>Root CID</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map(({ root }) => (
                <tr key={root.toString()}>
                  <td>
                    <a href={`https://${root.toString()}.ipfs.w3s.link/`}>
                      {root.toString()}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav className='flex flex-row justify-center'>
          <UploadsListCore.PrevButton className='prev w3ui-button w-auto px-2'>
            <ChevronLeftIcon className='h-6 w-6'/>
          </UploadsListCore.PrevButton>
          <UploadsListCore.ReloadButton className='reload w3ui-button w-auto px-2'>
            <ArrowPathIcon className={`h-6 w-6  ${loading ? 'animate-spin' : ''}`}/>
          </UploadsListCore.ReloadButton>
          <UploadsListCore.NextButton className='next w3ui-button w-auto px-2'>
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
        <div className='w3-uploads-list'>
          <Uploads uploads={props.uploadsList?.[0].data} loading={props.uploadsList?.[0].loading ?? false}/>
        </div>
      )}
    </UploadsListCore>
  )
}
