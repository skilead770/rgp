/**
 * Build a display URL from a Google Photos baseUrl.
 * Google Photos supports width (=w), height (=h), and crop (=c) parameters.
 *
 * @param {string} baseUrl - raw baseUrl from the Picker API
 * @param {number} width   - max width in pixels
 * @returns {string}
 */
export function photoUrl(baseUrl, width = 800) {
  if (!baseUrl) return ''
  return `${baseUrl}=w${width}`
}

/**
 * Build a thumbnail URL (square crop).
 *
 * @param {string} baseUrl
 * @param {number} size - width & height in pixels
 * @returns {string}
 */
export function thumbUrl(baseUrl, size = 300) {
  if (!baseUrl) return ''
  return `${baseUrl}=w${size}-h${size}-c`
}
