import { createServer } from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const port = process.env.PORT ?? 9201
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtureName = process.env.FIXTURE_NAME || 'workflow.car'

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  fs.readFile(
    path.resolve(`${__dirname}`, '..', 'fixtures', fixtureName),
    (error, content) => {
      if (error) {
        res.writeHead(500)
        res.end()
      }
      res.writeHead(200, {
        'Content-disposition': 'attachment; filename=' + fixtureName,
      })
      res.end(content)
    }
  )
})

server.listen(port, () => console.log(`Listening on :${port}`))
process.on('SIGTERM', () => process.exit(0))
