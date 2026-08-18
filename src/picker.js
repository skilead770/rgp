const PICKER_BASE = 'https://photospicker.googleapis.com/v1'

async function apiFetch(url, token, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message || body?.error?.status || `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return res.json()
}

/**
 * Create a new Picker session.
 * Returns { id, pickerUri, mediaItemsSet }
 */
export async function createPickerSession(token) {
  return apiFetch(`${PICKER_BASE}/sessions`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/**
 * Get current state of a Picker session.
 * Returns { id, pickerUri, mediaItemsSet }
 */
export async function getPickerSession(token, sessionId) {
  return apiFetch(`${PICKER_BASE}/sessions/${encodeURIComponent(sessionId)}`, token)
}

/**
 * Fetch the media items the user selected.
 * Call only after mediaItemsSet === true.
 * Returns { mediaItems: [ { id, createTime, type, mediaFile: { baseUrl, mimeType, mediaFileMetadata } } ] }
 */
export async function getPickerMediaItems(token, sessionId, pageSize = 100) {
  return apiFetch(
    `${PICKER_BASE}/mediaItems?sessionId=${encodeURIComponent(sessionId)}&pageSize=${pageSize}`,
    token
  )
}

/**
 * Open the picker popup and wait for the user to finish selecting.
 * Polls every pollInterval ms. Retries after popup closes for up to retryMs ms.
 *
 * Resolves with 'done' when mediaItemsSet becomes true.
 * Resolves with 'closed' if popup closed without a selection.
 * Rejects on API error.
 */
export function openPickerPopup(pickerUri, {
  pollInterval = 2000,
  retryAfterClose = 5,
  retryDelay = 2000,
  popupFeatures = 'width=1000,height=700,menubar=no,toolbar=no',
} = {}) {
  const popup = window.open(pickerUri, 'gphotosPicker', popupFeatures)
  if (!popup) {
    return Promise.reject(Object.assign(new Error('Popup blocked'), { code: 'POPUP_BLOCKED' }))
  }
  return { popup, popupBlocked: false }
}

/**
 * Full flow: open picker popup, poll until selected, return raw media items array.
 * Returns array of { id, baseUrl, mimeType, width, height, description } or throws.
 *
 * @param {string} token - Google OAuth access token (photospicker.mediaitems.readonly scope)
 * @param {object} opts
 * @param {number} opts.pollInterval   - ms between session polls (default 2000)
 * @param {number} opts.retryAfterClose - how many times to retry after popup closes (default 5)
 * @param {number} opts.retryDelay     - ms between retries after popup closes (default 2000)
 * @param {string} opts.popupFeatures  - window.open features string
 * @param {function} opts.onStatus     - called with status string updates
 */
export async function pickPhotos(token, opts = {}) {
  const {
    pollInterval = 2000,
    retryAfterClose = 5,
    retryDelay = 2000,
    popupFeatures = 'width=1000,height=700,menubar=no,toolbar=no',
    onStatus = () => {},
  } = opts

  onStatus('Creating picker session…')
  const session = await createPickerSession(token)

  onStatus('Opening Google Photos picker…')
  const popup = window.open(session.pickerUri, 'gphotosPicker', popupFeatures)
  if (!popup) {
    throw Object.assign(new Error('Popup was blocked — allow popups for this site.'), { code: 'POPUP_BLOCKED' })
  }

  onStatus('Waiting for photo selection…')
  const result = await new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(poll)
          onStatus('Popup closed — checking for selection…')
          let remaining = retryAfterClose
          while (remaining-- > 0) {
            await new Promise(r => setTimeout(r, retryDelay))
            const s = await getPickerSession(token, session.id)
            if (s.mediaItemsSet) { resolve('done'); return }
          }
          resolve('closed')
          return
        }
        const s = await getPickerSession(token, session.id)
        if (s.mediaItemsSet) {
          clearInterval(poll)
          popup.close()
          resolve('done')
        }
      } catch (err) {
        clearInterval(poll)
        reject(err)
      }
    }, pollInterval)
  })

  if (result === 'closed') {
    return []
  }

  onStatus('Fetching selected photos…')
  const data = await getPickerMediaItems(token, session.id)
  return normalizeItems(data.mediaItems || [])
}

function normalizeItems(items) {
  return items.map(item => {
    const meta = item.mediaFile?.mediaFileMetadata
    return {
      id:          item.id,
      baseUrl:     item.mediaFile?.baseUrl || '',
      mimeType:    item.mediaFile?.mimeType || 'image/jpeg',
      filename:    item.mediaFile?.filename || '',
      width:       meta?.width  || null,
      height:      meta?.height || null,
      description: item.description || '',
      createTime:  item.createTime || null,
    }
  })
}
