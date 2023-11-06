import * as RateLimitsStorage from './rate-limits-storage-tests.js'
import { test } from '../test.js'
test({ 'in memory rate limits storage': RateLimitsStorage.test })
