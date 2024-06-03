import { createServer } from 'http'
import { parseLink } from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import { Receipt, Message } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import { Assert } from '@web3-storage/content-claims/capability'
import { randomCAR } from './random.js'

const port = process.env.PORT ?? 9201

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  const taskID = req.url?.split('/')[1] ?? ''
  if (taskID === 'unavailable') {
    res.writeHead(404)
    res.end()
    return
  }

  const issuer = await Signer.generate()
  const content = (await randomCAR(128)).cid
  const locationClaim = await Assert.location.delegate({
    issuer,
    audience: issuer,
    with: issuer.toDIDKey(),
    nb: {
      content,
      location: ['http://localhost'],
    },
    expiration: Infinity,
  })

  const receipt = await Receipt.issue({
    issuer,
    fx: {
      fork: [locationClaim],
    },
    ran: parseLink(taskID),
    result: {
      ok: {
        site: locationClaim.link(),
      },
    },
  })

  const message = await Message.build({
    receipts: [receipt],
  })
  const request = CAR.request.encode(message)
  res.writeHead(200)
  res.end(request.body)
})

server.listen(port, () => console.log(`Listening on :${port}`))
process.on('SIGTERM', () => process.exit(0))
