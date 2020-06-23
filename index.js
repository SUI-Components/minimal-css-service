const IS_LOCAL_TEST = !process.env.AWS_LAMBDA_FUNCTION_VERSION

const puppeteer = require(IS_LOCAL_TEST ? 'puppeteer' : 'puppeteer-core')
const chrome = IS_LOCAL_TEST ? {} : require('chrome-aws-lambda')

const cssPurge = require('css-purge')
const qs = require('querystring')

const {devices} = require('./config')

async function extractCssWithCoverageFromUrl({
  customHeaders,
  height,
  url,
  userAgent,
  width
}) {
  // Setup a browser instance
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless
  })
  // Create a new page and navigate to it
  const page = await browser.newPage()
  // Set viewport depending
  await page.setViewport({width, height})
  await page.setUserAgent(userAgent)
  customHeaders && (await page.setExtraHTTPHeaders(customHeaders))
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

module.exports = async (req, res) => {
  const query = qs.parse(req.url.split('?')[1])
  const {url} = query
  // https://critical-css.com/m/https://milanuncios.com
  const device = req.url.slice(1, 2)

  console.log(`Using ${url} with device ${device}`)

  const customHeaders = req.headers
  // get the deviceInfo depending on the device path used, by default is mobile
  const {width, height, userAgent} = devices[device] || devices.m

  try {
    const css = await extractCssWithCoverageFromUrl({
      customHeaders,
      height,
      url,
      userAgent,
      width
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/css')
    return res.end(css)
  } catch (error) {
    console.error(error) // eslint-disable-line
    res.statusCode = 400
    return res.end(error.toString())
  }
}
