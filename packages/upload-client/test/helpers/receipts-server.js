import { createServer } from 'http'
import { parseLink } from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import { Receipt, Message } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import { Assert } from '@web3-storage/content-claims/capability'
import { randomCAR } from './random.js'

const port = process.env.PORT ?? 9201

/**
 * @param {string} taskCid
 */
const generateReceipt = async (taskCid) => {
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
    ran: parseLink(taskCid),
    result: {
      ok: {
        site: locationClaim.link(),
      },
    },
  })

  const message = await Message.build({
    receipts: [receipt],
  })
  return CAR.request.encode(message).body
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  const taskCid = req.url?.split('/')[1] ?? ''
  if (taskCid === 'unavailable') {
    res.writeHead(404)
    return res.end()
  } else if (taskCid === 'failed') {
    const body = await generateReceipt((await randomCAR(128)).cid.toString())
    res.writeHead(200)
    return res.end(body)
  }

  const body = await generateReceipt(taskCid)
  res.writeHead(200)
  res.end(body)
})

server.listen(port, () => console.log(`Listening on :${port}`))
process.on('SIGTERM', () => process.exit(0))
