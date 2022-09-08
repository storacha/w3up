import React, { createContext, useState, ReactNode } from 'react'

const init = {
  settings: new Map(),
  loadUserSettings: () => {},
  unloadUserSettings: () => {}
}

export interface AuthSettingsContextValue {
  settings: Map<string, any>
  loadUserSettings: () => void
  unloadUserSettings: () => void
}

export const AuthSettingsContext = createContext<AuthSettingsContextValue>(init)

export interface AuthSettingsProviderProps {
  children?: ReactNode
}

export function AuthSettingsProvider ({ children }: AuthSettingsProviderProps): ReactNode {
  const [settings, setSettings] = useState(init.settings)

  const loadUserSettings = (): void => {
    // try {
    //   let parsed = defaultSettings
    //   const secret = Uint8Array.from(Buffer.from(parsed.secret, 'base64'))

    //   const settingsDB = new Map()
    //   settingsDB.set('email', parsed.email)
    //   settingsDB.set('secret', secret)
    //   settingsDB.set('validated', parsed.validated)
    //   setSettings(settingsDB)
    //   console.log('set settings')
    // } catch (err) {
    //   console.log(err)
    // }
    // TODO: load settings from secure storage
  }

  const unloadUserSettings = (): void => {
    setSettings(init.settings)
  }

  const value = { settings, loadUserSettings, unloadUserSettings }

  return (
    <AuthSettingsContext.Provider value={value}>
      {children}
    </AuthSettingsContext.Provider>
  )
}
