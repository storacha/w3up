import { Miniflare } from 'miniflare'
import anyTest from 'ava'

/**
 * @typedef {import("ava").TestFn<{mf: mf}>} TestFn
 */

// eslint-disable-next-line unicorn/prefer-export-from
export const test = /** @type {TestFn} */ (anyTest)

export const bindings = {
  _PRIVATE_KEY:
    'CLpFlekLFiiKHK0jntCG2N+6uSL3EXXaAGf/GWHSI4TtAJIYi+7SFqzrmxGBRFTTudA7TlnFcewDTS/autetzQ==',
}

export const mf = new Miniflare({
  packagePath: true,
  wranglerConfigPath: true,
  sourceMap: true,
  bindings,
})
