const http = require('http')
const url = require('url')
const extractCssFromUrl = require('.')

http
  .createServer((req, res) => {
    req.query = url.parse(req.url, true).query
    return extractCssFromUrl(req, res)
  })
  .listen(1337, () => {
    console.log(`Server started at http://localhost:1337`)
  })
