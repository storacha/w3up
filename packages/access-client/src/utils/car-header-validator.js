/* eslint-disable jsdoc/check-alignment */
/* eslint-disable jsdoc/check-indentation */

/** Auto-generated with ipld-schema-validator@0.0.0-dev at Thu Jun 17 2021 from IPLD Schema:
 *
 * type CarHeader struct {
 *   version Int
 *   roots optional [&Any]
 *   # roots is _not_ optional for CarV1 but we defer that check within code to
 *   # gracefully handle the >V1 case where it's just {version:X}
 * }
 *
 */

const Kinds = {
  Null: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => obj === null,
  Int: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => Number.isInteger(obj),
  Float: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) =>
    typeof obj === 'number' && Number.isFinite(obj),
  String: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => typeof obj === 'string',
  Bool: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => typeof obj === 'boolean',
  Bytes: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => obj instanceof Uint8Array,
  Link: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) =>
    !Kinds.Null(obj) && typeof obj === 'object' && obj.asCID === obj,
  List: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => Array.isArray(obj),
  Map: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) =>
    !Kinds.Null(obj) &&
    typeof obj === 'object' &&
    obj.asCID !== obj &&
    !Kinds.List(obj) &&
    !Kinds.Bytes(obj),
}
/** @type {{ [k in string]: (obj:any)=>boolean}} */
const Types = {
  Int: Kinds.Int,
  'CarHeader > version': /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => Types.Int(obj),
  'CarHeader > roots (anon) > valueType (anon)': Kinds.Link,
  'CarHeader > roots (anon)': /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) =>
    Kinds.List(obj) &&
    Array.prototype.every.call(
      obj,
      Types['CarHeader > roots (anon) > valueType (anon)']
    ),
  'CarHeader > roots': /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => Types['CarHeader > roots (anon)'](obj),
  CarHeader: /**
   * @param {any} obj
   * @returns {boolean}
   */ (/** @type {any} */ obj) => {
    const keys = obj && Object.keys(obj)
    return (
      Kinds.Map(obj) &&
      ['version'].every((k) => keys.includes(k)) &&
      Object.entries(obj).every(
        ([name, value]) =>
          Types['CarHeader > ' + name] && Types['CarHeader > ' + name](value)
      )
    )
  },
}

export const CarHeader = Types.CarHeader
