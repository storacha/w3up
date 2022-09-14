import { Miniflare } from 'miniflare'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function getWebsocketServer() {
  const mf = new Miniflare({
    packagePath: path.join(__dirname, '../../../access-ws/package.json'),
    wranglerConfigPath: path.join(
      __dirname,
      '../../../access-ws/wrangler.toml'
    ),
    sourceMap: true,
    modules: true,
    // log: new Log(LogLevel.DEBUG),
    buildCommand: undefined,
    port: 8788,
  })

  return mf.startServer()
}
