const http = require('http')
const extractCssFromUrl = require('.')

http
  .createServer((req, res) => {
    const url = new URL(req.url)
    req.query = Object.fromEntries(url.searchParams.entries())
    return extractCssFromUrl(req, res)
  })
  .listen(1337, () => {
    console.log(`Server started at http://localhost:1337`)
  })
