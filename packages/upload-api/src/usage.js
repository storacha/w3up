import { provide as provideReport } from './usage/report.js'
import { provide as provideRecord } from './usage/record.js'

/** @param {import('./types.js').UsageServiceContext} context */
export const createService = (context) => ({
  report: provideReport(context),
  record: provideRecord(context),
})
