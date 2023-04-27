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
  const array = new Uint32Array(1)
  const random = self.crypto.getRandomValues(array)[0]
  // 0xFFFFFFFF is the max value of a Uint32
  return Math.floor((random / 0xff_ff_ff_ff) * max)
}

const DEFAULT_ENTROPY = 50
const entropyPerWord = Math.log2(words.length)

function randomWord() {
  const randomIdx = randomInt(words.length)
  return words[randomIdx]
}

/**
 *
 * @param {number} [entropy]
 * @returns {string}
 */
export function generateNoncePhrase(entropy = DEFAULT_ENTROPY) {
  const phrase = []
  let nWordsNeeded = Math.ceil(entropy / entropyPerWord)
  while (nWordsNeeded--) {
    phrase.push(randomWord())
  }
  return phrase.join(' ')
}
