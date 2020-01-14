<div align="center">
	<h1>Minimal CSS Service</h1>
	<p>Get the critical CSS from a website</p>
</div>

[![Platform: Now V2](https://img.shields.io/badge/platform-Now%20V2-50e3c2.svg)](https://zeit.co/now)

## Local testing

I have no idea how local testing for Now is supposed to work, so I created a tiny HTTP server in `dev.js` that calls the actual function that gets deployed.
Run `npm run dev` to run a local version of the function for local testing.

## Optional headers to the destination URL

You can optionally add all the custom HTTP headers you want to this service request, that way your destination URL request will have also such headers. See the following example:

```
GET: https://critical-css-service.now.sh/m/https://my-website.com/

HEADERS:
{
	"X-Custom-Token": "123456"
}
```

## Deployment

Using [Now](https://zeit.co/now): `now`.

## Credits

- This repo is pretty much an exact copy of [this example from Zeit](https://github.com/zeit/now-examples/tree/master/puppeteer-screenshot).
- The idea to get all the CSS from a webpage comes from [CSS Stats](https://github.com/cssstats/cssstats)
