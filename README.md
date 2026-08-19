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

## GCP Setup (one-time)

### 1. Create a Google Cloud project
Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project** → give it a name.

### 2. Enable the Google Photos Picker API
**APIs & Services → Enable APIs and Services** → search for **"Google Photos Picker API"** → Enable.

### 3. Configure the OAuth consent screen
**APIs & Services → OAuth consent screen**
- User type: **External**
- Fill in app name, support email, developer email → Save
- Under **Scopes** → Add scope → search for `photospicker` → select  
  `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` → Save
- Under **Test users** → add your Google account email → Save

> ⚡ This scope does **not** require Google's manual verification — you can publish the app immediately without review.

### 4. Create OAuth 2.0 credentials
**APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
- Application type: **Web application**
- **Authorized JavaScript origins**: add your app's domain (e.g. `https://myapp.web.app` and `http://localhost:5173`)
- **Authorized redirect URIs**: same domains
- Click **Create** → copy the **Client ID**

### 5. Wire up in your app
This SDK works with any OAuth flow that returns a Google access token.  
Example with **Firebase Auth**:

```js
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const provider = new GoogleAuthProvider()
provider.addScope('https://www.googleapis.com/auth/photospicker.mediaitems.readonly')
provider.setCustomParameters({ prompt: 'consent' })

const result = await signInWithPopup(auth, provider)
const token = GoogleAuthProvider.credentialFromResult(result).accessToken
// pass `token` to useGooglePhotosPicker()
```

## Prerequisites

1. Google Cloud project with **Google Photos Picker API** enabled (see GCP Setup above)
2. OAuth consent screen configured with `photospicker.mediaitems.readonly` scope
3. A Google OAuth access token with that scope

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

## Album browsing

Programmatic album listing is not possible. Google removed the `photoslibrary.readonly` scope in April 2025 — `albums.list` returns 403. The Picker API has no album filter either.

**The only way to reach a specific album** is through the Picker's built-in search bar:

> Tell your users: *"In the Google Photos window, type your album name in the search box."*

**Important limitation — English album names only:**  
The Picker's search only returns results for album names written in English (Latin characters). Albums named in other languages (Hebrew, Arabic, Chinese, etc.) will not appear in the search results. This is a Google Picker limitation — it cannot be worked around via the API.

If your users have albums in non-Latin languages, advise them to rename the album to an English name in Google Photos before picking.

## License

MIT
