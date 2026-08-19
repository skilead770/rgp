import React, { useEffect, useState } from 'react'

/**
 * Fetch a Google Photos Picker baseUrl with an Authorization header,
 * convert to a blob URL, and return it for use in <img> src.
 * Automatically revokes the blob URL on unmount or when inputs change.
 */
export function useAuthPhoto(url, token) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!url || !token) { setSrc(null); return }
    let blobUrl = null
    let cancelled = false

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.blob()
      })
      .then(blob => {
        if (cancelled) return
        blobUrl = URL.createObjectURL(blob)
        setSrc(blobUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc('')
      })

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url, token])

  return src  // null = loading, '' = error, string = ready
}

/**
 * <AuthPhoto> — drop-in replacement for <img> when the src requires
 * a Google OAuth bearer token. Shows a grey placeholder while loading.
 *
 * Props: url, token, style, className, alt, title, draggable, onDragStart
 */
export function AuthPhoto({ url, token, style, placeholder, ...rest }) {
  const src = useAuthPhoto(url, token)

  if (src === null || src === '') {
    return (
      <div
        style={{
          background: src === '' ? '#fee' : '#e8eaed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...style,
        }}
        title={src === '' ? 'Failed to load' : 'Loading…'}
      />
    )
  }

  return <img src={src} style={style} {...rest} />
}
