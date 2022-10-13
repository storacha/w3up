import { Delegation, UCAN } from '@ucanto/core'
import { SigningPrincipal } from '@ucanto/principal'

/**
 * @typedef SettingsObject
 * @property {string} [secret]
 * @property {string} [agent_secret]
 * @property {string} [account_secret]
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
 * Takes a JSON string and builds a settings object from it.
 *
 * @param {string} settingsString - The settings string (typically from cli export-settings)
 * @returns {Promise<Map<string,any>>} The settings object.
 */
export async function importSettings(settingsString) {
  const imported = JSON.parse(settingsString)
  const settings = new Map()

  if (imported) {
    for (var key of Object.keys(imported)) {
      if (key == 'secret' || key == 'agent_secret' || key == 'account_secret') {
        const parsed = toPrincipal(imported[key])
        if (parsed) {
          const formatted = SigningPrincipal.format(parsed)
          settings.set(key, formatted)
        }
      } else if (key == 'delegations') {
        /** @type any */
        const delegations = {}

        for (const [did, del] of Object.entries(imported.delegations)) {
          const ucan = UCAN.parse(del?.ucan)
          const root = await UCAN.write(ucan)
          delegations[did] = {
            ucan: Delegation.create({ root }),
            alias: del.alias,
          }
        }

        settings.set('delegations', delegations)
      } else {
        settings.set(key, imported[key])
      }
    }
  }

  // FAIL STATE.
  if (!settings.has('account_secret') || !settings.has('agent_secret')) {
    //await identity()
  }

  return settings
}

/**
 * Takes a settings map and builds a POJO out of it.
 *
 * @param {Map<string, any>} settings - The settings object.
 * @returns {SettingsObject} The settings object.
 */
export function exportSettings(settings) {
  /** @type SettingsObject */
  const output = {}

  if (settings.has('secret')) {
    output.secret = SigningPrincipal.format(settings.get('secret'))
  }

  if (settings.has('agent_secret')) {
    const parsed = SigningPrincipal.parse(settings.get('agent_secret'))
    output.agent_secret = SigningPrincipal.format(parsed)
  }

  if (settings.has('account_secret')) {
    const parsed = SigningPrincipal.parse(settings.get('account_secret'))
    output.account_secret = SigningPrincipal.format(parsed)
  }

  if (settings.has('delegations')) {
    output.delegations = {}

    for (const [did, del] of Object.entries(settings.get('delegations'))) {
      const imported = Delegation.import([del?.ucan?.root])

      output.delegations[did] = {
        // @ts-ignore
        ucan: UCAN.format(imported),
        alias: del.alias,
      }
    }
  }

  return output
}
