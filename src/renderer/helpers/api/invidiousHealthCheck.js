import i18n from '../../i18n/index'
import { getProxyUrl, invidiousFetch, isHtmlResponse, openBlockedResource } from './invidious'

/**
 * @typedef {'ok' | 'warning' | 'error'} HealthCheckStatus
 * @typedef {'reachable' | 'api' | 'cors' | 'video'} HealthCheckId
 * @typedef {{ id: HealthCheckId, status: HealthCheckStatus, detail: string, latencyMs: number | null }} HealthCheckResult
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

  return invidiousFetch(url, { ...init, signal: controller.signal })
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
 * @param {string} url
 * @returns {Promise<{ status: HealthCheckStatus, detail: string, latencyMs: number, allowOrigin: string, data: any }>}
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
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Unreachable', { error: errorMessage(err) }),
      latencyMs: Math.round(performance.now() - start),
      allowOrigin: '',
      data: null
    }
  }

  const latencyMs = Math.round(performance.now() - start)
  const allowOrigin = response.headers.get('access-control-allow-origin') || ''
  const body = await response.text().catch(() => '')

  // A reachable instance that answers with a challenge page has not told us
  // anything about its API yet, so the API counts as broken until the
  // challenge has been passed
  if (isHtmlResponse(body)) {
    openBlockedResource(url)
    return {
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Bot Challenge Required'),
      latencyMs,
      allowOrigin,
      data: null
    }
  }

  if (!response.ok) {
    return {
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Http Error', { status: response.status }),
      latencyMs,
      allowOrigin,
      data: null
    }
  }

  try {
    return { status: 'ok', detail: '', latencyMs, allowOrigin, data: JSON.parse(body) }
  } catch {
    return {
      status: 'error',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Invalid Json'),
      latencyMs,
      allowOrigin,
      data: null
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
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Unreachable', { error: errorMessage(err) }),
      latencyMs: null
    }
  }
}

/**
 * @param {{ status: HealthCheckStatus, detail: string, latencyMs: number }} probe
 * @returns {HealthCheckResult}
 */
function apiResult(probe) {
  return {
    id: 'api',
    status: probe.status,
    detail: probe.status === 'ok'
      ? i18n.global.t('Settings.Backend Settings.Health Check.Responds With Json', { milliseconds: probe.latencyMs })
      : probe.detail,
    latencyMs: probe.latencyMs
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
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Allows Cross Origin Requests'),
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
    detail: i18n.global.t('Settings.Backend Settings.Health Check.Cors Unverifiable'),
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

    // An instance that refuses to proxy a stream may answer with a challenge
    // page instead of a partial response
    if (isHtmlResponse(await response.text().catch(() => ''))) {
      openBlockedResource(url)
      return { id: 'video', status: 'error', detail: i18n.global.t('Settings.Backend Settings.Health Check.Bot Challenge Required'), latencyMs }
    }

    if (!response.ok) {
      return { id: 'video', status: 'error', detail: i18n.global.t('Settings.Backend Settings.Health Check.Http Error', { status: response.status }), latencyMs }
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
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Unreachable', { error: errorMessage(err) }),
      latencyMs: null
    }
  }
}

/**
 * @param {string} instanceUrl
 * @param {boolean} proxiesVideos whether Invidious is the video backend
 * @returns {Promise<HealthCheckResult>}
 */
async function checkVideo(instanceUrl, proxiesVideos) {
  if (!proxiesVideos) {
    return {
      id: 'video',
      status: 'warning',
      detail: i18n.global.t('Settings.Backend Settings.Health Check.Video Not Proxied'),
      latencyMs: null
    }
  }

  const info = await requestApiJson(`${instanceUrl}/api/v1/videos/${HEALTH_CHECK_VIDEO_ID}`)

  if (info.status === 'error') {
    return { id: 'video', status: info.status, detail: info.detail, latencyMs: info.latencyMs }
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
 * @param {{ proxiesVideos: boolean }} options
 * @returns {Promise<HealthCheckResult[]>}
 */
export async function runInvidiousHealthCheck(instanceUrl, { proxiesVideos }) {
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

  return await checkInstance(base, proxiesVideos)
}

/**
 * @param {string} base an instance url, already trimmed and without a trailing slash
 * @param {boolean} proxiesVideos
 * @returns {Promise<HealthCheckResult[]>}
 */
async function checkInstance(base, proxiesVideos) {
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
    await checkVideo(base, proxiesVideos)
  )

  return results
}
