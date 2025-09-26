const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0' // Listen on all interfaces
const port = process.env.PORT || 3001

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// SSL certificate options
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'localhost.crt')),
}

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on https://localhost:${port}`)
      console.log(`> Also available on https://192.168.31.22:${port} (for mobile testing)`)
      console.log(`> Note: You'll need to accept the self-signed certificate warning`)
    })
})