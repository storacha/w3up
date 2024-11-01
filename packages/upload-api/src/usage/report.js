import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Usage } from '@storacha/capabilities'

/** @param {API.UsageServiceContext} context */
export const provide = (context) =>
  Provider.provide(Usage.report, (input) => report(input, context))

/**
 * @param {API.Input<Usage.report>} input
 * @param {API.UsageServiceContext} context
 * @returns {Promise<API.Result<API.UsageReportSuccess, API.UsageReportFailure>>}
 */
const report = async ({ capability }, context) => {
  const space = capability.with
  const period = {
    from: new Date(capability.nb.period.from * 1000),
    to: new Date(capability.nb.period.to * 1000),
  }

  const res = await context.provisionsStorage.getStorageProviders(space)
  if (res.error) return res

  /** @type {Array<[API.ProviderDID, API.UsageData]>} */
  const reports = []
  for (const provider of res.ok) {
    const res = await context.usageStorage.report(provider, space, period)
    if (res.error) return res
    reports.push([res.ok.provider, res.ok])
  }

  return { ok: Object.fromEntries(reports) }
}
