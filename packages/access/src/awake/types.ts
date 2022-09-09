import * as UCAN from '@ipld/dag-ucan'
import { z } from 'zod'
import * as Messages from './messages.js'

export type MessageType = z.infer<typeof Messages['MessageType']>

export interface AwakeMessage {
  awv: string
  type: string
}

export interface AwakeInit {
  awv: string
  type: string
  did: UCAN.DID
  caps: UCAN.Capability[]
}

export type PinChallengeMessage = z.infer<
  typeof Messages['PinChallengeMessage']
> & {
  did: `did:${string}`
}
