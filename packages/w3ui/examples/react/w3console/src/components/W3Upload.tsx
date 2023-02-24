import React from 'react'
import { W3APIProvider } from './providers/W3API'
import { Authenticator } from './Authenticator'
import { Uploader } from './Uploader'
import { UploadsList } from './UploadsList'

export function W3Upload (): JSX.Element {
  return (
    <W3APIProvider>
      <Authenticator>
        <Uploader />
        <UploadsList />
      </Authenticator>
    </W3APIProvider>
  )
}
