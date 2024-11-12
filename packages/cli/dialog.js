import { useState, useKeypress, createPrompt, isEnterKey } from '@inquirer/core'
import chalk from 'chalk'
import ansiEscapes from 'ansi-escapes'
/**
 * @typedef {'concealed'|'revealed'|'validating'|'done'} Status
 * @typedef {object} MnemonicOptions
 * @property {string[]} secret
 * @property {string} message
 * @property {string} [prefix]
 * @property {string} [revealMessage]
 * @property {string} [submitMessage]
 * @property {string} [validateMessage]
 * @property {string} [exitMessage]
 */
export const mnemonic = createPrompt(
  /**
   * @param {MnemonicOptions} config
   * @param {(answer: unknown) => void} done
   */
  (
    {
      prefix = '🔑',
      message,
      secret,
      revealMessage = 'When ready, hit enter to reveal the key',
      submitMessage = 'Please save the key and then hit enter to continue',
      validateMessage = 'Please type or paste key to ensure it is correct',
      exitMessage = 'Key matched!',
    },
    done
  ) => {
    const [status, setStatus] = useState(/** @type {Status} */ ('concealed'))
    const [input, setInput] = useState('')

    useKeypress((key, io) => {
      switch (status) {
        case 'concealed':
          if (isEnterKey(key)) {
            setStatus('revealed')
          }
          return
        case 'revealed':
          if (isEnterKey(key)) {
            setStatus('validating')
          }
          return
        case 'validating': {
          // if line break is pasted or typed we want interpret it as
          // a space character, this is why we write current input back
          // to the terminal with a trailing space. That way user will
          // still be able to edit the input afterwards.
          if (isEnterKey(key)) {
            io.write(`${input} `)
          } else {
            // If current input matches the secret we are done.
            const input = parseInput(io.line)
            setInput(io.line)
            if (input.join('') === secret.join('')) {
              setStatus('done')
              done({})
            }
          }
          return
        }
        default:
          return done({})
      }
    })

    switch (status) {
      case 'concealed':
        return show({
          prefix,
          message,
          key: conceal(secret),
          hint: revealMessage,
        })
      case 'revealed':
        return show({ prefix, message, key: secret, hint: submitMessage })
      case 'validating':
        return show({
          prefix,
          message,
          key: diff(parseInput(input), secret),
          hint: validateMessage,
        })
      case 'done':
        return show({
          prefix,
          message,
          key: conceal(secret, CORRECT),
          hint: exitMessage,
        })
    }
  }
)

/**
 * @param {string} input
 */
const parseInput = (input) => input.trim().split(/[\n\s]+/)

/**
 * @param {string[]} input
 * @param {string[]} key
 */
const diff = (input, key) => {
  const source = input.join('')
  let offset = 0
  const output = []
  for (const word of key) {
    let delta = []
    for (const expect of word) {
      const actual = source[offset]
      if (actual === expect) {
        delta.push(CORRECT)
      } else if (actual != undefined) {
        delta.push(chalk.inverse.strikethrough.red(actual))
      } else {
        delta.push(CONCEAL)
      }
      offset++
    }
    output.push(delta.join(''))
  }

  return output
}

/**
 * @param {object} state
 * @param {string} state.prefix
 * @param {string} state.message
 * @param {string[]} state.key
 * @param {string} state.hint
 */
const show = ({ prefix, message, key, hint }) =>
  `${prefix} ${message}\n\n${key.join(' ')}\n\n${hint}${ansiEscapes.cursorHide}`

/**
 * @param {string[]} key
 * @param {string} [char]
 */
const conceal = (key, char = CONCEAL) =>
  key.map((word) => char.repeat(word.length))

const CONCEAL = '█'
const CORRECT = chalk.inverse('•')
