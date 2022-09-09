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
