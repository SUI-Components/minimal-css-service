const {ENV} = process.env
const puppeteer = require(ENV && ENV === 'dev' ? 'puppeteer' : 'puppeteer-core')
const chrome = require('chrome-aws-lambda')
const cssPurge = require('css-purge')

const {DEFAULT_DEVICE, DEVICES} = require('./devices')

/**
 * Use puppeteer and Code Coverage in order to extract the critical CSS
 * @param {{ url: string, device: string, customHeaders: object }} params
 */
async function extractCssWithCoverageFromUrl({url, device, customHeaders}) {
  // get the deviceInfo depending on the device path used, by default is mobile
  const {width, height, userAgent} = DEVICES[device] || DEVICES[DEFAULT_DEVICE]
  // Setup a browser instance
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: true
  })
  // Create a new page and navigate to it
  const page = await browser.newPage()
  // Use the viewport and userAgent for the device
  await page.setViewport({width, height})
  await page.setUserAgent(userAgent)
  // Set the custom headers needed for the request
  customHeaders && (await page.setExtraHTTPHeaders(customHeaders))
  // start the CSS coverage before navigating
  await page.coverage.startCSSCoverage()
  // go to the url and wait until everything is loaded
  const response = await page.goto(url, {waitUntil: 'networkidle0'})
  // if there's an error in the response, stop here and throw an error
  if (!response.ok()) {
    throw new Error(
      `Response status code for the url ${url} was ${response.status()}`
    )
  }
  // navigation is done, let's get the CSS coverage object
  const coverage = await page.coverage.stopCSSCoverage()
  // extract the css string from the code coverage
  const coveredCSS = extractCoveredCSSFrom({coverage})
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

/**
 * Extract covered CSS from Code Coverage object
 * @param {{coverage: object}} params
 * @returns {string} coveredCSS
 */
const extractCoveredCSSFrom = ({coverage}) => {
  let coveredCSS = ''
  for (const entry of coverage) {
    for (const range of entry.ranges) {
      coveredCSS += entry.text.slice(range.start, range.end)
    }
  }
  return coveredCSS
}

/**
 * Extract the URL param using query and url
 * @param {{query: object, url: string}} params
 */
const extractURLFrom = ({query, url}) => {
  const {url: urlFromQuery} = query
  if (urlFromQuery) return decodeURIComponent(urlFromQuery)
  // extract from the url
  return url.slice(3)
}

/**
 * Extract all parameters from request object
 * @param {object} req The Request object
 * @param {object} req.query
 * @param {object} req.headers
 * @param {string} req.url
 * @returns {{ customHeaders: Object, device: string, url: string}}
 */
const extractParamsFrom = req => {
  const {headers, query, url} = req
  const {headerToSend} = query
  const customHeaders = headerToSend
    ? {[headerToSend]: headers[headerToSend]}
    : headers

  return {
    customHeaders,
    device: url.slice(1, 2),
    url: extractURLFrom({query, url})
  }
}

/**
 * Endpoint
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
module.exports = async (req, res) => {
  const {customHeaders, device, url} = extractParamsFrom(req)
  // check if the url is empty to return an error
  if (url === '') {
    res.statusCode = 400
    return res.end('URL is required')
  }

  try {
    const css = await extractCssWithCoverageFromUrl({
      url,
      device,
      customHeaders
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
