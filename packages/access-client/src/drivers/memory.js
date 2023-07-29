/**
 * @template {Record<string, any>} T
 * @implements {Driver<T>}
 */
export class MemoryDriver {
  /**
   * @type {T}
   */
  #data;

  constructor() {
    this.#data = {};
  }

  async open() {}

  async close() {}

  async reset() {
    this.#data = {};
  }

  /** @param {T} data */
  async save(data) {
    this.#data = { ...data };
  }

  /** @returns {Promise<T|undefined>} */
  async load() {
    if (Object.keys(this.#data).length === 0) return;
    return this.#data;
  }
}
