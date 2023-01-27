import words from './phrase-words.json'

/* above can be gathered by hand or e.g.
sudo apt install wamerican-small jq

numWords=1024
# HT: https://stackoverflow.com/a/15065490/179583
shuf -n $numWords <(grep -v \' /usr/share/dict/words) | \
# HT: https://stackoverflow.com/a/34576956/179583
jq --raw-input | jq --slurp > src/utils/phrase-words.json
*/

// TODO: I can't get this to work, but it'd be better to use this!
// import { randomInt } from 'node:crypto'

/**
 *
 * @param {number} max
 * @returns {number}
 */
function randomInt(max) {
  // NOTE: does not support all calling patterns of the real one!
  const min = 0
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values
  return Math.floor(Math.random() * (max - min) + min)
}

const entropyPerWord = Math.log2(words.length)

function randomWord() {
  const randomIdx = randomInt(words.length)
  return words[randomIdx]
}

/**
 *
 * @param {number} entropy
 * @returns {string}
 */
export function generateNoncePhrase(entropy) {
  const phrase = []
  let nWordsNeeded = Math.ceil(entropy / entropyPerWord)
  while (nWordsNeeded--) {
    phrase.push(randomWord())
  }
  return phrase.join(' ')
}
