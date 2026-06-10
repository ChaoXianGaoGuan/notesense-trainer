import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve('dist')
const PORT = 4173

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8']
])

export default async function globalSetup() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`)
      const pathname = requestUrl.pathname === '/' ? '/index.html' : decodeURIComponent(requestUrl.pathname)
      const safePath = path.normalize(pathname).replace(/^[/\\]+/, '')
      const filePath = path.join(ROOT, safePath)

      if (!filePath.startsWith(ROOT)) {
        response.writeHead(403)
        response.end('Forbidden')
        return
      }

      const bytes = await readFile(filePath).catch(async (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          return readFile(path.join(ROOT, 'index.html'))
        }
        throw error
      })

      response.writeHead(200, {
        'content-type': MIME_TYPES.get(path.extname(filePath)) ?? 'application/octet-stream'
      })
      response.end(bytes)
    } catch (error) {
      response.writeHead(500)
      response.end(String(error))
    }
  })

  await listen(server)

  return async () => {
    await close(server)
  }
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(PORT, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
