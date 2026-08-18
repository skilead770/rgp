import { useState, useCallback } from 'react'
import { pickPhotos } from './picker.js'

/**
 * React hook for the Google Photos Picker flow.
 *
 * @param {object} opts
 * @param {string|null} opts.token       - Google OAuth access token
 * @param {function}    opts.onPick      - called with photo[] when user confirms selection
 * @param {function}    [opts.onError]   - called with Error on failure
 * @param {object}      [opts.pickerOpts]- passed to pickPhotos()
 *
 * @returns {{ open, picking, status }}
 *   open()    - start the picker flow
 *   picking   - true while the flow is running
 *   status    - current status string (suitable for display)
 */
export function useGooglePhotosPicker({ token, onPick, onError, pickerOpts = {} } = {}) {
  const [picking, setPicking] = useState(false)
  const [status, setStatus]   = useState('')

  const open = useCallback(async () => {
    if (!token) {
      const err = new Error('No Google OAuth token provided.')
      onError?.(err)
      return
    }
    setPicking(true)
    setStatus('')
    try {
      const photos = await pickPhotos(token, {
        ...pickerOpts,
        onStatus: setStatus,
      })
      if (photos.length > 0) {
        onPick?.(photos)
        setStatus(`✓ ${photos.length} photo${photos.length !== 1 ? 's' : ''} selected`)
        setTimeout(() => setStatus(''), 3000)
      } else {
        setStatus('No photos selected.')
        setTimeout(() => setStatus(''), 3000)
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`)
      onError?.(err)
    } finally {
      setPicking(false)
    }
  }, [token, onPick, onError, pickerOpts])

  return { open, picking, status }
}
