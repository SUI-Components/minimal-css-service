const {ENV} = process.env
const puppeteer = require(ENV && ENV === 'dev' ? 'puppeteer' : 'puppeteer-core')
const chrome = require('chrome-aws-lambda')
const cssPurge = require('css-purge')

async function extractCssWithCoverageFromUrl({url, width, height, userAgent}) {
  // Setup a browser instance
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: true
  })

  // Create a new page and navigate to it
  const page = await browser.newPage()
  await page.setViewport({width, height})
  await page.setUserAgent(userAgent)
  await page.coverage.startCSSCoverage()
  const response = await page.goto(url, {waitUntil: 'networkidle0'})

  if (!response.ok()) {
    throw new Error(
      `Response status code for the url ${url} was ${response.status()}`
    )
  }

  const coverage = await page.coverage.stopCSSCoverage()

  let coveredCSS = ''
  for (const entry of coverage) {
    for (const range of entry.ranges) {
      coveredCSS += entry.text.slice(range.start, range.end)
    }
  }

  // Close the browser to close the connection and free up resources
  await browser.close()

  // return minified css
  return new Promise((resolve, reject) => {
    cssPurge.purgeCSS(coveredCSS, {}, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

const devices = {
  m: {
    userAgent:
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Mobile Safari/537.36',
    width: 360,
    height: 640
  },
  t: {
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
    width: 768,
    height: 1024
  },
  d: {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
    width: 1024,
    height: 768
  }
}

const extractURLFrom = ({req}) => {
  const {url: urlFromQuery} = req.query
  if (urlFromQuery) return decodeURIComponent(urlFromQuery)
  // extract from the url
  return req.url.slice(3)
}

module.exports = async (req, res) => {
  // https://critical-css.com/m/https://milanuncios.com

  const device = req.url.slice(1, 2)
  const url = extractURLFrom({req})

  if (url === '') {
    res.statusCode = 400
    return res.end('URL is required')
  }

  // get the deviceInfo depending on the device path used, by default is mobile
  const {width, height, userAgent} = devices[device] || devices.m

  try {
    const css = await extractCssWithCoverageFromUrl({
      url,
      width,
      height,
      userAgent
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/css')
    return res.end(css)
  } catch (error) {
    console.error(error)
    res.statusCode = 400
    return res.end(error.toString())
  }
}
