import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react'
// @ts-expect-error https://github.com/web3-storage/w3up-client/issues/2
import Client from 'w3up-client'
import { AuthSettingsContext } from './AuthSettings.js'

const W3_STORE_DID = 'did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z'
const SERVICE_URL = 'https://mk00d0sf0h.execute-api.us-east-1.amazonaws.com/'

function createUploader (settings: Map<string, any>) {
  if (!settings || !settings.has('email')) {
    return null
  }
  return new Client({
    settings,
    serviceURL: SERVICE_URL,
    serviceDID: W3_STORE_DID,
  })
}

const UploaderContext = createContext(null)

export function UploaderProvider ({ children }: { children: ReactNode }) {
  const { settings, loadUserSettings } = useContext(AuthSettingsContext)
  const [uploader, setUploader] = useState(null)

  useEffect(() => {
    if (settings) {
      setUploader(createUploader(settings))
    } else {
      loadUserSettings()
    }
  }, [settings, uploader])

  return (
    <UploaderContext.Provider value={uploader}>
      {children}
    </UploaderContext.Provider>
  )
}

export function useUploader () {
  return useContext(UploaderContext)
}
