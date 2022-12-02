export * as Space from './space.js'
export * as Top from './top.js'
export * as Store from './store.js'
export * as Upload from './upload.js'
export * as Voucher from './voucher.js'
export * as Utils from './utils.js'

/** @type {import('./types').AbilitiesArray} */
export const abilitiesAsStrings = [
  '*',
  'space/*',
  'space/info',
  'space/recover',
  'space/recover-validation',
  'upload/*',
  'upload/add',
  'upload/remove',
  'upload/list',
  'store/*',
  'store/add',
  'store/remove',
  'store/list',
  'voucher/claim',
  'voucher/redeem',
]
