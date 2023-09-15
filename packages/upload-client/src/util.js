/**
 * @typedef {import("@web3-storage/capabilities/src/types").SpaceDID} SpaceDID
 */

/**
 * 
 * @param {string} did 
 * @returns {SpaceDID}
 */
export function ensureSpaceDID(did){
  if (did.startsWith('did:key')) {
    return /** @type {SpaceDID} */(did)
  } else {
    throw new Error(`${did} is not a space DID`)
  }
}