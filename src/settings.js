import { Delegation, UCAN } from '@ucanto/core'
import { SigningPrincipal } from '@ucanto/principal'

import { delegationToString, stringToDelegation } from './encoding.js'

/**
 * @typedef SettingsObject
 * @property {string} [secret]
 * @property {string} [agent_secret]
 * @property {string} [account_secret]
 * @property {string} [email]
 * @property {string} [account]
 * @property {any} [delegations]
 */

/**
 * Convert some stored secret into a principal
 * @param {any} secret - The imported settings.
 */
export function toPrincipal(secret) {
  // This is messy, but covers all cases of old / new settings...
  try {
    return SigningPrincipal.decode(secret)
  } catch (error) {
    try {
      return SigningPrincipal.parse(secret)
    } catch (error) {
      try {
        const buff = Buffer.from(secret, 'base64')
        return SigningPrincipal.decode(buff)
      } catch (error) {
        return null
      }
    }
  }
}

/**
 * @param {Map<string, any>|SettingsObject} objectToParse
 * @returns {Promise<Map<string, any>>}
 */
export async function objectToMap(objectToParse) {
  // TODO: CHANGE LATER, store check is only for CONF
  if (objectToParse instanceof Map) {
    /** @type Map<string, any> */
    return objectToParse
  }

  const settings = 'store' in objectToParse ? objectToParse : new Map()

  if (objectToParse) {
    if (objectToParse.secret) {
      const principal = toPrincipal(objectToParse.secret)
      if (principal) {
        settings.set('secret', SigningPrincipal.format(principal))
      }
    }
    if (objectToParse.account_secret) {
      const principal = toPrincipal(objectToParse.account_secret)
      if (principal) {
        settings.set('account_secret', SigningPrincipal.format(principal))
      }
    }
    if (objectToParse.agent_secret) {
      const principal = toPrincipal(objectToParse.agent_secret)
      if (principal) {
        settings.set('agent_secret', SigningPrincipal.format(principal))
      }
    }
    if (objectToParse.email) {
      settings.set('email', objectToParse.email)
    }

    if (objectToParse.account) {
      settings.set('account', objectToParse.account)
    }

    if (objectToParse.delegations) {
      const delegations = {}

      for (const [did, del] of Object.entries(objectToParse.delegations)) {
        // @ts-ignore
        delegations[did] = {
          ucan: await stringToDelegation(del?.ucan),
          alias: del.alias,
        }
      }

      settings.set('delegations', delegations)
    }
  }

  // FAIL STATE.
  if (!settings.has('account_secret') || !settings.has('agent_secret')) {
    //await identity()
  }

  return settings
}

/**
 * Takes a JSON string and builds a settings object from it.
 *
 * @param {Map<string,any>|string|SettingsObject} settings - The settings string (typically from cli export-settings)
 * @returns {Promise<Map<string,any>>} The settings object.
 */
export async function importSettings(settings) {
  if (typeof settings == 'string') {
    try {
      return objectToMap(JSON.parse(settings))
    } catch (err) {
      throw new Error('Invalid settings json string.')
    }
  }
  return objectToMap(settings)
}

/**
 * Takes a settings map and builds a POJO out of it.
 *
 * @param {Map<string, any>} settings - The settings object.
 * @returns {Promise<SettingsObject>} The settings object.
 */
export async function exportSettings(settings) {
  /** @type SettingsObject */
  const output = {}

  if (settings.has('email')) {
    output.email = settings.get('email')
  }

  if (settings.has('secret')) {
    const principal = toPrincipal(settings.get('secret'))
    if (principal) {
      output.secret = SigningPrincipal.format(principal)
    }
  }

  if (settings.has('agent_secret')) {
    const principal = toPrincipal(settings.get('agent_secret'))
    if (principal) {
      output.agent_secret = SigningPrincipal.format(principal)
    }
  }

  if (settings.has('account_secret')) {
    const principal = toPrincipal(settings.get('account_secret'))
    if (principal) {
      output.account_secret = SigningPrincipal.format(principal)
    }
  }

  if (settings.has('account')) {
    output.account = settings.get('account')
  }

  if (settings.has('delegations')) {
    output.delegations = {}

    for (const [did, del] of Object.entries(settings.get('delegations'))) {
      output.delegations[did] = {
        // @ts-ignore
        ucan: del.ucan,
        alias: del.alias,
      }
    }
  }

  return output
}
