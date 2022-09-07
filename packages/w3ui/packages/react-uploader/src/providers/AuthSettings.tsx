import React, { createContext, useState, ReactNode } from 'react'

const init = {
  settings: new Map(),
  loadUserSettings: () => {},
  unloadUserSettings: () => {}
}

export const AuthSettingsContext = createContext(init)

export function AuthSettingsProvider ({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(init.settings)

  const loadUserSettings = () => {
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

  const unloadUserSettings = () => {
    setSettings(init.settings)
  }

  const value = { settings, loadUserSettings, unloadUserSettings }

  return (
    <AuthSettingsContext.Provider value={value}>
      {children}
    </AuthSettingsContext.Provider>
  )
}
