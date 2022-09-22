import * as API from '../type.js'

/**
 * @typedef {{has(path:API.Link): API.Await<boolean>}} FileStore
 * @typedef {Map<string, API.Accounting.Link|null>} CARSet
 * @typedef {{
 * has(id:API.DID, value: API.Link):API.Await<unknown>
 * set(id:API.DID, value: {link: API.Link, proof: API.LinkedProof}):API.Await<unknown>
 * get(id:API.DID, link:string): API.Await<CARSet|undefined>
 * }} MetadataStore
 */

/**
 * @param {{db?:MetadataStore, cars?:FileStore}} [options]
 * @returns {API.Accounting.Provider}
 */
export const create = ({ db, cars } = {}) => ({
  /**
   * @param {API.DID} group
   * @param {API.Link} link
   * @param {API.LinkedProof} proof
   */
  async add(group, link, proof) {
    const [isLinked, isInS3] = await Promise.all([
      db?.has(group, link),
      cars?.has(link),
    ])
    if (!isLinked) {
      db?.set(group, { link, proof })
    }
    return isInS3 ? { status: 'in-s3' } : { status: 'not-in-s3' }
  },

  async link(rootLink, links) {
    return { rootLink, links }
  },

  /**
   * @param {API.DID} group
   * @param {API.Accounting.Link} link
   * @param {API.LinkedProof} proof
   */
  async remove(group, link, proof) {
    return db.remove(group, link)
  },
  /**
   * @param {API.DID} group
   * @param {API.LinkedProof} proof
   */
  async list(group, proof) {
    return db.list(group)
  },
})
