import { abilitiesAsStrings } from '@storacha/capabilities'

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
 * @returns {import('@storacha/capabilities/types').ServiceAbility[]}
 */
export function asAbilities(abilities) {
  for (const ability of abilities) {
    if (
      !setOfAbilities.has(
        /** @type {import('@storacha/capabilities/types').ServiceAbility} */ (
          ability
        )
      )
    ) {
      throw new Error(`${ability} is not a supported capability`)
    }
  }
  return /** @type {import('@storacha/capabilities/types').ServiceAbility[]} */ (
    abilities
  )
}
