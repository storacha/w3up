import { abilitiesAsStrings } from '@web3-storage/capabilities'

const setOfAbilities = new Set(abilitiesAsStrings)

/**
 * Verify and return Abilities.
 *
 * Given a list of strings representing capability names (Abilities),
 * verify that all the strings are valid Abilities and return Abilities[].
 *
 * Abilities[] is still just a list of strings, but this helps us play
 * nice with Typescript.
 *
 * @param {string[]} abilities
 * @returns {import('@web3-storage/capabilities/types').W3UpAbility[]}
 */
export function asAbilities(abilities) {
  for (const ability of abilities) {
    if (
      !setOfAbilities.has(
        /** @type {import('@web3-storage/capabilities/types').W3UpAbility} */ (
          ability
        )
      )
    ) {
      throw new Error(`${ability} is not a supported capability`)
    }
  }
  return /** @type {import('@web3-storage/capabilities/types').W3UpAbility[]} */ (
    abilities
  )
}
