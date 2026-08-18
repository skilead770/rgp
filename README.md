# react-google-photos-picker

React hook and utilities for the **Google Photos Picker API**.  
Pick photos from Google Photos by link — no file download, no storage, no copied data.

## How it works

Google Photos Picker API lets users pick photos from their library.  
Your app receives **authenticated URLs** pointing back to Google's servers.  
Display them with the included `<AuthPhoto>` component that fetches with a bearer token.

## Install

```bash
npm install react-google-photos-picker
```

## Prerequisites

1. Enable **Google Photos Picker API** in Google Cloud Console
2. Add scope `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` to your OAuth consent screen
3. Obtain a Google OAuth access token with that scope (e.g. via Firebase Auth `GoogleAuthProvider`)

## Quick start

```jsx
import { useGooglePhotosPicker, AuthPhoto } from 'react-google-photos-picker'

function MyPicker({ googleToken }) {
  const { open, picking, status } = useGooglePhotosPicker({
    token: googleToken,
    onPick: (photos) => {
      // photos: [{ id, baseUrl, mimeType, filename, width, height }]
      console.log(photos)
    },
  })

  return (
    <div>
      <button onClick={open} disabled={picking}>
        {picking ? status : 'Pick from Google Photos'}
      </button>
    </div>
  )
}
```

## Display photos

Google Photos Picker URLs require an Authorization header — plain `<img>` tags return 403.  
Use `<AuthPhoto>` to fetch with the bearer token automatically:

```jsx
import { AuthPhoto } from 'react-google-photos-picker'

<AuthPhoto
  url={photo.baseUrl}
  token={googleToken}
  style={{ width: 200, height: 200, objectFit: 'cover' }}
/>
```

## API

### `useGooglePhotosPicker(options)`

| Option | Type | Description |
|---|---|---|
| `token` | `string` | Google OAuth access token |
| `onPick` | `(photos[]) => void` | Called with selected photos |
| `onError` | `(Error) => void` | Called on failure |
| `pickerOpts` | `object` | Passed to `pickPhotos()` |

Returns `{ open, picking, status }`.

---

### `pickPhotos(token, opts)` → `Promise<Photo[]>`

Full picker flow — create session, open popup, poll, fetch items.

| Option | Default | Description |
|---|---|---|
| `pollInterval` | `2000` | ms between session polls |
| `retryAfterClose` | `5` | retries after popup closes |
| `retryDelay` | `2000` | ms between retries |
| `onStatus` | `() => {}` | status string callback |

---

### Photo object

```js
{
  id:          string,   // Google Photos media item ID
  baseUrl:     string,   // authenticated URL (use with AuthPhoto or fetch + bearer token)
  mimeType:    string,   // "image/jpeg" etc.
  filename:    string,   // original filename e.g. "IMG_20240101.jpg"
  width:       number,
  height:      number,
  description: string,   // user description (often empty)
  createTime:  string,   // ISO timestamp
}
```

---

### `<AuthPhoto url token ...imgProps />`

Drop-in replacement for `<img>` when the src requires a Google OAuth bearer token.  
Shows a grey placeholder while loading, red tint on error.

---

### `useAuthPhoto(url, token)` → `string | null`

Hook that fetches an authenticated URL and returns a blob URL for `<img>` src.  
Returns `null` while loading, `''` on error.

---

### URL helpers

```js
import { photoUrl, thumbUrl } from 'react-google-photos-picker'

photoUrl(baseUrl, 800)       // "...=w800"
thumbUrl(baseUrl, 300)       // "...=w300-h300-c"  (square crop)
```

---

### Low-level functions

```js
import {
  createPickerSession,    // POST /sessions → { id, pickerUri }
  getPickerSession,       // GET /sessions/:id → { mediaItemsSet }
  getPickerMediaItems,    // GET /mediaItems?sessionId=...
} from 'react-google-photos-picker'
```

## Notes

- **baseUrl expiry**: Google Photos URLs expire after ~60 minutes. For persistent storage, store the `id` and re-fetch via the API when needed.
- **Scope**: Only `photospicker.mediaitems.readonly` is required — no Google verification needed (unlike the Library API).
- **Album info**: The Picker API does not expose which album a photo belongs to. Only filename, dimensions, and creation time are available.

## License

MIT
