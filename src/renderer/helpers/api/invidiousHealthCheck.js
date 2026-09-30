import i18n from '../../i18n/index'
import { getProxyUrl, invidiousFetch, isHtmlResponse } from './invidious'
import { HEALTH_CHECK_REQUEST_HEADER } from '../../../constants'

/**
 * @typedef {'ok' | 'warning' | 'error'} HealthCheckStatus
 * @typedef {'reachable' | 'api' | 'cors' | 'video'} HealthCheckId
 * @typedef {{ id: HealthCheckId, status: HealthCheckStatus, detail: string, latencyMs: number | null, challengeUrl?: string, hasResponse?: boolean, responseBody?: string }} HealthCheckResult
 */

/**
 * A video used to find out whether an instance is able to serve video streams.
 * This is the first video that was ever uploaded to YouTube, which makes it a
 * good candidate: it can't be taken down, it has progressive (non adaptive)
 * streams, and it is short.
 */
const HEALTH_CHECK_VIDEO_ID = 'jNQXAC9IVRw'

/** @type {HealthCheckId[]} the order the results are reported in */
export const HEALTH_CHECK_IDS = ['reachable', 'api', 'cors', 'video']

const REQUEST_TIMEOUT = 10000

/**
 * An error thrown by the deadline below, so that a request that ran out of time
 * is reported differently from one that was refused
 */
class TimeoutError extends Error {}

/**
 * @param {unknown} err
 * @returns {string}
 */
function errorMessage(err) {
  if (err instanceof TimeoutError) {
    return i18n.global.t('Settings.Backend Settings.Health Check.Timed Out')
  }

  return err instanceof Error ? err.message : String(err)
}

/**
 * Every request gets its own deadline, so that an instance that stops
 * responding halfway through a run can't leave the remaining checks hanging
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT)

  let timedOut = false

  /*
    Electron's main process watches for responses that an instance replaced with
    an HTML page, and opens the challenge modal when it sees one. That can't tell
    the requests of a health check apart from the ones it wants to block: the
    homepage a health check asks for is HTML on a healthy instance, so every run
    would be reported as a challenge and reopen the modal. A header lets the main
    process recognise these requests and let them report for themselves instead.

    A web build has no such listener, and a custom header on a cross origin
    request makes the browser send a preflight that many instances refuse, so
    this is only sent by the desktop app.
  */
  const headers = process.env.IS_ELECTRON
    ? { [HEALTH_CHECK_REQUEST_HEADER]: '1', ...init.headers }
    : init.headers

  return invidiousFetch(url, { ...init, headers, signal: controller.signal })
    .catch((err) => {
      // the abort that the deadline above causes arrives as a generic abort
      // error, which would otherwise be reported as an unreachable instance
      throw timedOut ? new TimeoutError('Timed out') : err
    })
    .finally(() => { clearTimeout(timeoutId) })
}

/**
 * Asks an instance for JSON and reports every way it can refuse: a bot
 * protection challenge in place of the response, an error status, or a body
 * that isn't JSON at all.
 *
 * The CORS verdict is read off the same response, so that checking the headers
 * doesn't cost an extra request.
 *
 * `challengeUrl` is the url that has to be passed in the challenge page, or an
 * empty string when there was no challenge. It is only reported, never opened,
 * as opening it reloads the app and would make these checks run again.
 *
 * `hasResponse` tells whether there is a response worth showing at all, as a
 * failure like "not JSON" says nothing about what came back instead. It is a
 * separate flag from `responseBody`, as an empty body is both a real answer and
 * the very thing that makes a "not JSON" verdict impossible to interpret.
 * @param {string} url
 * @returns {Promise<{ status: HealthCheckStatus, detail: string, latencyMs: number, allowOrigin: string, data: any, challengeUrl: string, hasResponse: boolean, responseBody: string }>}
 */
async function requestApiJson(url) {
  const start = performance.now()

  /** @type {Response} */
  let response
  try {
    response = await fetchWithTimeout(url)
  } catch (err) {
    return {
      status: 'error',
      detail: errorMessage(err),
      latencyMs: Math.round(performance.now() - start),
      allowOrigin: '',
      data: null,
      challengeUrl: '',
      hasResponse: false,
      responseBody: ''
    }
  }

  const latencyMs = Math.round(performance.now() - start)
  const allowOrigin = response.headers.get('access-control-allow-origin') || ''
  const body = await response.text().catch(() => '')

  /*
    A reachable instance that answers with a challenge page has not told us
    anything about its API yet, so the API counts as broken until the challenge
    has been passed.

    The challenge page is deliberately not opened here. Passing a challenge
    reloads the app, which runs these checks again on startup, so opening it by
    itself would put the user in a loop of modals with no way out. The caller is
    given the url instead and lets the user decide to open it.
  */
  if (isHtmlResponse(body)) {
    return {
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Bot Challenge Required'),
      latencyMs,
      allowOrigin,
      data: null,
      challengeUrl: url,
      responseBody: body,
      hasResponse: true
    }
  }

  if (!response.ok) {
    return {
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Http Error', { status: response.status }),
      latencyMs,
      allowOrigin,
      data: null,
      challengeUrl: '',
      hasResponse: true,
      responseBody: body
    }
  }

  try {
    return { status: 'ok', detail: '', latencyMs, allowOrigin, data: JSON.parse(body), challengeUrl: '', hasResponse: false, responseBody: '' }
  } catch {
    return {
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Invalid Json'),
      latencyMs,
      allowOrigin,
      data: null,
      challengeUrl: '',
      hasResponse: true,
      responseBody: body
    }
  }
}

/**
 * Times the instance's own homepage. This is the cheapest request that proves
 * the instance answers at all, and it deliberately isn't an API request, as the
 * homepage always responds with HTML and would trip the challenge check.
 * @param {string} instanceUrl
 * @returns {Promise<HealthCheckResult>}
 */
async function checkReachable(instanceUrl) {
  const start = performance.now()

  try {
    await fetchWithTimeout(`${instanceUrl}/`)

    const latencyMs = Math.round(performance.now() - start)
    return {
      id: 'reachable',
      status: 'ok',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Responded In', { milliseconds: latencyMs }),
      latencyMs
    }
  } catch (err) {
    return {
      id: 'reachable',
      status: 'error',
      detail: errorMessage(err),
      latencyMs: null
    }
  }
}

/**
 * @param {{ status: HealthCheckStatus, detail: string, latencyMs: number, challengeUrl: string, hasResponse: boolean, responseBody: string }} probe
 * @returns {HealthCheckResult}
 */
function apiResult(probe) {
  return {
    id: 'api',
    status: probe.status,
    detail: probe.status === 'ok'
      ? i18n.global.t('Settings.Backend Settings.Health Check.Responded In', { milliseconds: probe.latencyMs })
      : probe.detail,
    latencyMs: probe.latencyMs,
    challengeUrl: probe.challengeUrl,
    hasResponse: probe.hasResponse,
    responseBody: probe.responseBody
  }
}

/**
 * Turns the CORS headers of an API response into a verdict.
 *
 * Electron runs with `webSecurity: false`, so the renderer may read the headers
 * of a response from the instance even when the instance doesn't allow cross
 * origin requests, which makes a missing header a real finding there instead of
 * a tautology. A web build is at the mercy of the browser's same origin policy,
 * where a response the page isn't allowed to read never resolves at all, so
 * there the header can only be proven present, never proven missing.
 * @param {{ status: HealthCheckStatus, detail: string, latencyMs: number, allowOrigin: string }} probe
 * @returns {HealthCheckResult}
 */
function corsResult(probe) {
  if (probe.status === 'error') {
    return {
      id: 'cors',
      status: 'warning',
      detail: probe.detail,
      latencyMs: probe.latencyMs
    }
  }

  if (probe.allowOrigin !== '') {
    return {
      id: 'cors',
      status: 'ok',
      detail: '',
      latencyMs: probe.latencyMs
    }
  }

  if (process.env.IS_ELECTRON) {
    return {
      id: 'cors',
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Cors Header Missing'),
      latencyMs: probe.latencyMs
    }
  }

  return {
    id: 'cors',
    status: 'warning',
    detail: i18n.global.t('Settings.Backend Settings.Health Check.Cors Unverifiable Reason'),
    latencyMs: probe.latencyMs
  }
}

/**
 * Picks the smallest progressive stream of a video, as those are the cheapest
 * for an instance to proxy and are enough to prove that proxying works
 * @param {any} video
 * @returns {string} the stream url, or an empty string when there is none
 */
function pickSmallestProgressiveStream(video) {
  const streams = Array.isArray(video?.formatStreams) ? video.formatStreams : []
  const progressive = streams.filter((stream) => typeof stream?.url === 'string' && stream.url !== '')

  if (progressive.length === 0) {
    return ''
  }

  /*
    Invidious reports the bitrate of a stream as a number on some versions and
    as a string on others, so it has to be coerced instead of compared as is.
    Streams without a usable bitrate sort last, as there is no way to tell
    whether they are small.
  */
  const bitrateOf = (stream) => {
    const bitrate = Number(stream.bitrate)
    return Number.isFinite(bitrate) ? bitrate : Infinity
  }

  progressive.sort((a, b) => bitrateOf(a) - bitrateOf(b))
  return progressive[0].url
}

/**
 * Builds the url that the instance serves a proxied stream on. The instance
 * serves it on the YouTube path itself, with `local=true` telling it to send
 * the bytes instead of redirecting the client to YouTube.
 * @param {string} instanceUrl
 * @param {string} streamUrl
 * @returns {string} an empty string when the stream url can't be used
 */
function buildProxiedStreamUrl(instanceUrl, streamUrl) {
  try {
    const url = new URL(getProxyUrl(streamUrl))
    url.searchParams.set('local', 'true')
    return url.toString()
  } catch {
    return ''
  }
}

/**
 * Asks the instance for a single byte of a stream, which is enough to prove
 * that it is willing and able to proxy video without pulling any real data
 * @param {string} url
 * @returns {Promise<HealthCheckResult>}
 */
async function probeStream(url) {
  const start = performance.now()

  try {
    const response = await fetchWithTimeout(url, { headers: { Range: 'bytes=0-0' } })
    const latencyMs = Math.round(performance.now() - start)

    /*
      An instance that refuses to proxy a stream may answer with a challenge page
      instead of a partial response. As in `requestApiJson`, the url is only
      reported so that the user can choose to open the challenge page.
    */
    const body = await response.text().catch(() => '')

    if (isHtmlResponse(body)) {
      return {
        id: 'video',
        status: 'error',
        detail: i18n.global.t('Settings.Backend Settings.Health Check.Bot Challenge Required'),
        latencyMs,
        challengeUrl: url,
        hasResponse: true,
        responseBody: body
      }
    }

    if (!response.ok) {
      return {
        id: 'video',
        status: 'error',
        detail: i18n.global.t('Settings.Backend Settings.Health Check.Http Error', { status: response.status }),
        latencyMs,
        hasResponse: true,
        responseBody: body
      }
    }

    return {
      id: 'video',
      status: 'ok',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Stream Reachable', { milliseconds: latencyMs }),
      latencyMs
    }
  } catch (err) {
    return {
      id: 'video',
      status: 'error',
      detail: errorMessage(err),
      latencyMs: null
    }
  }
}

/**
 * Asks the instance whether it can serve video at all.
 *
 * This runs even when videos play straight from YouTube, as the point of the
 * check is to show what the instance is capable of rather than whether it is
 * used, which is what the selected video backend says.
 * @param {string} instanceUrl
 * @returns {Promise<HealthCheckResult>}
 */
async function checkVideo(instanceUrl) {
  const info = await requestApiJson(`${instanceUrl}/api/v1/videos/${HEALTH_CHECK_VIDEO_ID}`)

  if (info.status === 'error') {
    return {
      id: 'video',
      status: info.status,
      detail: info.detail,
      latencyMs: info.latencyMs,
      challengeUrl: info.challengeUrl,
      hasResponse: info.hasResponse,
      responseBody: info.responseBody
    }
  }

  const streamUrl = pickSmallestProgressiveStream(info.data)
  const proxiedUrl = streamUrl === '' ? '' : buildProxiedStreamUrl(instanceUrl, streamUrl)

  if (proxiedUrl === '') {
    return { id: 'video', status: 'error', detail: i18n.global.t('Settings.Backend Settings.Health Check.No Streams'), latencyMs: null }
  }

  return await probeStream(proxiedUrl)
}

/**
 * Runs every health check against an Invidious instance.
 *
 * The checks run one after another instead of all at once, as a burst of
 * requests is a common reason for an instance to start refusing them.
 * @param {string} instanceUrl an instance url, with or without a trailing slash
 * @returns {Promise<HealthCheckResult[]>}
 */
export async function runInvidiousHealthCheck(instanceUrl) {
  const base = instanceUrl.trim().replace(/\/+$/, '')

  /** @type {HealthCheckResult[]} */
  const results = []

  // An instance that hasn't been typed yet has nothing to be checked against
  if (base === '') {
    for (const id of HEALTH_CHECK_IDS) {
      results.push({
        id,
        status: 'warning',
        detail: i18n.global.t('Settings.Backend Settings.Health Check.No Instance'),
        latencyMs: null
      })
    }

    return results
  }

  return await checkInstance(base)
}

/**
 * @param {string} base an instance url, already trimmed and without a trailing slash
 * @returns {Promise<HealthCheckResult[]>}
 */
async function checkInstance(base) {
  /** @type {HealthCheckResult[]} */
  const results = []

  const reachable = await checkReachable(base)
  results.push(reachable)

  if (reachable.status === 'error') {
    // An instance that doesn't answer can't be asked anything else, and every
    // further check would only repeat the same timeout
    for (const id of HEALTH_CHECK_IDS.slice(1)) {
      results.push({ id, status: 'error', detail: i18n.global.t('Settings.Backend Settings.Health Check.Skipped'), latencyMs: null })
    }

    return results
  }

  // `/api/v1/stats` is the endpoint that Invidious's own instance list is built
  // from, so an instance serving it is an instance that serves the API
  const stats = await requestApiJson(`${base}/api/v1/stats`)

  results.push(
    apiResult(stats),
    corsResult(stats),
    await checkVideo(base)
  )

  return results
}
