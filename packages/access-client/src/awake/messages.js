/**
 * @module awake-messages
 * @packageDocumentation
 * @ignore
 */
import { z } from 'zod'

export const MessageType = z.enum(['awake/init', 'awake/res', 'awake/msg'])

export const AwakeMessage = z.object({
  awv: z.literal('0.1.0'),
  type: MessageType,
})

export const PinChallengeMessage = z
  .object({
    did: z
      .string()
      .startsWith('did:', { message: 'should be a DID `did:key:z...`' }),
    sig: z.string(),
  })
  .strict()

export const AckMessage = z
  .object({
    'awake/ack': z
      .string()
      .startsWith('did:', { message: 'should be a DID `did:key:z...`' }),
  })
  .strict()

export const InitResponse = AwakeMessage.extend({
  type: z.literal('awake/init'),
  did: z
    .string()
    .startsWith('did:', { message: 'should be a DID `did:key:z...`' }),
  caps: z
    .array(
      z.object({
        with: z.string(),
        can: z.string(),
      })
    )
    .nonempty(),
}).strict()

export const DID = z
  .string()
  .startsWith('did:', { message: 'should be a DID `did:key:z...`' })

export const ResResponse = AwakeMessage.extend({
  type: z.literal('awake/res'),
  iss: DID,
  aud: DID,
  msg: z.string().min(1),
}).strict()
