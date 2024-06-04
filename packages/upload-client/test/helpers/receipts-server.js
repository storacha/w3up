import * as CAR from '@ucanto/transport/car'
import { Message } from '@ucanto/core'
import { createServer } from 'http'
import { randomCAR } from './random.js'
import { generateAcceptReceipt } from '../helpers/utils.js'

const port = process.env.PORT ?? 9201

/**
 * @param {string} taskCid
 */
const encodeReceipt = async (taskCid) => {
  const receipt = await generateAcceptReceipt(taskCid)
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
    res.end()
  } else if (taskCid === 'failed') {
    const body = await encodeReceipt((await randomCAR(128)).cid.toString())
    res.writeHead(200)
    res.end(body)
  } else {
    const body = await encodeReceipt(taskCid)
    res.writeHead(200)
    res.end(body)
  }
})

server.listen(port, () => console.log(`Listening on :${port}`))
process.on('SIGTERM', () => process.exit(0))
