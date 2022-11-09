import { createServer } from 'http'

const port = process.env.PORT ?? 9000

const server = createServer((_, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.end()
})

server.listen(port, () => console.log(`Listening on :${port}`))
