/**
 * @param {string | URL} url
 */
export function isFreeTubeUrl(url) {
  let url_

  if (url instanceof URL) {
    url_ = url
  } else {
    url_ = URL.parse(url)
  }

  if (process.env.NODE_ENV === 'development') {
    return url_ !== null && url_.protocol === 'http:' && url_.host === 'localhost:9080' && (url_.pathname === '/' || url_.pathname === '/index.html')
  } else {
    return url_ !== null && url_.protocol === 'app:' && url_.host === 'bundle' && (url_.pathname === '/' || url_.pathname === '/index.html')
  }
}

/**
 * Gets the value of a header, as the webRequest listeners are given the headers
 * of a response as an array of values
 * @param {Record<string, string | string[]> | undefined} headers
 * @param {string} name the lowercase name of the header
 * @returns {string | undefined}
 */
export function getFirstHeaderValue(headers, name) {
  const value = headers?.[name]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

/**
 * @param {string | undefined} contentType
 * @returns {boolean}
 */
export function isHtmlContentType(contentType) {
  return typeof contentType === 'string' && /^\s*text\/html\s*(;|$)/i.test(contentType)
}
