// src/picker.js
var PICKER_BASE = "https://photospicker.googleapis.com/v1";
async function apiFetch(url, token, opts = {}) {
  var _a, _b;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts.headers || {}
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = ((_a = body == null ? void 0 : body.error) == null ? void 0 : _a.message) || ((_b = body == null ? void 0 : body.error) == null ? void 0 : _b.status) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
async function createPickerSession(token) {
  return apiFetch(`${PICKER_BASE}/sessions`, token, {
    method: "POST",
    body: JSON.stringify({})
  });
}
async function getPickerSession(token, sessionId) {
  return apiFetch(`${PICKER_BASE}/sessions/${encodeURIComponent(sessionId)}`, token);
}
async function getPickerMediaItems(token, sessionId, pageSize = 100) {
  return apiFetch(
    `${PICKER_BASE}/mediaItems?sessionId=${encodeURIComponent(sessionId)}&pageSize=${pageSize}`,
    token
  );
}
async function pickPhotos(token, opts = {}) {
  const {
    pollInterval = 2e3,
    retryAfterClose = 5,
    retryDelay = 2e3,
    popupFeatures = "width=1000,height=700,menubar=no,toolbar=no",
    onStatus = () => {
    }
  } = opts;
  onStatus("Creating picker session\u2026");
  const session = await createPickerSession(token);
  onStatus("Opening Google Photos picker\u2026");
  const popup = window.open(session.pickerUri, "gphotosPicker", popupFeatures);
  if (!popup) {
    throw Object.assign(new Error("Popup was blocked \u2014 allow popups for this site."), { code: "POPUP_BLOCKED" });
  }
  onStatus("Waiting for photo selection\u2026");
  const result = await new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(poll);
          onStatus("Popup closed \u2014 checking for selection\u2026");
          let remaining = retryAfterClose;
          while (remaining-- > 0) {
            await new Promise((r) => setTimeout(r, retryDelay));
            const s2 = await getPickerSession(token, session.id);
            if (s2.mediaItemsSet) {
              resolve("done");
              return;
            }
          }
          resolve("closed");
          return;
        }
        const s = await getPickerSession(token, session.id);
        if (s.mediaItemsSet) {
          clearInterval(poll);
          popup.close();
          resolve("done");
        }
      } catch (err) {
        clearInterval(poll);
        reject(err);
      }
    }, pollInterval);
  });
  if (result === "closed") {
    return [];
  }
  onStatus("Fetching selected photos\u2026");
  const data = await getPickerMediaItems(token, session.id);
  return normalizeItems(data.mediaItems || []);
}
function normalizeItems(items) {
  return items.map((item) => {
    var _a, _b, _c, _d;
    const meta = (_a = item.mediaFile) == null ? void 0 : _a.mediaFileMetadata;
    return {
      id: item.id,
      baseUrl: ((_b = item.mediaFile) == null ? void 0 : _b.baseUrl) || "",
      mimeType: ((_c = item.mediaFile) == null ? void 0 : _c.mimeType) || "image/jpeg",
      filename: ((_d = item.mediaFile) == null ? void 0 : _d.filename) || "",
      width: (meta == null ? void 0 : meta.width) || null,
      height: (meta == null ? void 0 : meta.height) || null,
      description: item.description || "",
      createTime: item.createTime || null
    };
  });
}

// src/useGooglePhotosPicker.js
import { useState, useCallback } from "react";
function useGooglePhotosPicker({ token, onPick, onError, pickerOpts = {} } = {}) {
  const [picking, setPicking] = useState(false);
  const [status, setStatus] = useState("");
  const open = useCallback(async () => {
    if (!token) {
      const err = new Error("No Google OAuth token provided.");
      onError == null ? void 0 : onError(err);
      return;
    }
    setPicking(true);
    setStatus("");
    try {
      const photos = await pickPhotos(token, {
        ...pickerOpts,
        onStatus: setStatus
      });
      if (photos.length > 0) {
        onPick == null ? void 0 : onPick(photos);
        setStatus(`\u2713 ${photos.length} photo${photos.length !== 1 ? "s" : ""} selected`);
        setTimeout(() => setStatus(""), 3e3);
      } else {
        setStatus("No photos selected.");
        setTimeout(() => setStatus(""), 3e3);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      onError == null ? void 0 : onError(err);
    } finally {
      setPicking(false);
    }
  }, [token, onPick, onError, pickerOpts]);
  return { open, picking, status };
}

// src/urls.js
function photoUrl(baseUrl, width = 800) {
  if (!baseUrl) return "";
  return `${baseUrl}=w${width}`;
}
function thumbUrl(baseUrl, size = 300) {
  if (!baseUrl) return "";
  return `${baseUrl}=w${size}-h${size}-c`;
}

// src/useAuthPhoto.jsx
import { useEffect, useState as useState2 } from "react";
function useAuthPhoto(url, token) {
  const [src, setSrc] = useState2(null);
  useEffect(() => {
    if (!url || !token) {
      setSrc(null);
      return;
    }
    let blobUrl = null;
    let cancelled = false;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.blob();
    }).then((blob) => {
      if (cancelled) return;
      blobUrl = URL.createObjectURL(blob);
      setSrc(blobUrl);
    }).catch(() => {
      if (!cancelled) setSrc("");
    });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url, token]);
  return src;
}
function AuthPhoto({ url, token, style, placeholder, ...rest }) {
  const src = useAuthPhoto(url, token);
  if (src === null || src === "") {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: src === "" ? "#fee" : "#e8eaed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style
        },
        title: src === "" ? "Failed to load" : "Loading\u2026"
      }
    );
  }
  return /* @__PURE__ */ React.createElement("img", { src, style, ...rest });
}
export {
  AuthPhoto,
  createPickerSession,
  getPickerMediaItems,
  getPickerSession,
  photoUrl,
  pickPhotos,
  thumbUrl,
  useAuthPhoto,
  useGooglePhotosPicker
};
//# sourceMappingURL=index.js.map