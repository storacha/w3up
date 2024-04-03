import type { UnknownLink, Receipt } from '@ucanto/interface'
import { Storage } from './storage.js'

export type ReceiptsStorage = Storage<UnknownLink, Receipt>
