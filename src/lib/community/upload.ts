import { MasterApiError } from "@/lib/account/api";
import type { CommunityUploadGrant } from "./types";

/** Sends the File directly to the gateway, with only its scoped grant. No ZIP parsing or full-file copy. */
export function transferUpload(grant: CommunityUploadGrant, file: File, signal: AbortSignal, progress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(grant.uploadUrl);
    if (url.username || url.password || !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
      reject(new Error("The upload service returned an invalid address.")); return;
    }
    if (!file.size || file.size > grant.maximumBytes || !Number.isFinite(Date.parse(grant.expiresAtUtc)) || Date.parse(grant.expiresAtUtc) <= Date.now()) {
      reject(new Error("This file does not fit the upload reservation, or the reservation expired.")); return;
    }
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const finish = (error?: Error) => { signal.removeEventListener("abort", abort); if (error) reject(error); else resolve(); };
    request.open("PUT", url.href);
    request.withCredentials = false;
    request.timeout = 300000;
    request.setRequestHeader("Authorization", `Bearer ${grant.token}`);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.upload.onprogress = event => { if (event.lengthComputable) progress(Math.min(99, Math.floor(event.loaded / event.total * 100))); };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) { progress(100); finish(); return; }
      let code = "upload_failed", message = "The transfer failed. Refresh its status, then retry.";
      try {
        const body: unknown = JSON.parse(request.responseText);
        if (body && typeof body === "object") {
          if ("code" in body && typeof body.code === "string") code = body.code;
          if ("message" in body && typeof body.message === "string") message = body.message;
        }
      } catch { /* Gateway/proxy responses may not be JSON. */ }
      finish(new MasterApiError(code, message, request.status));
    };
    request.onerror = () => finish(new Error("The upload service could not be reached. Check your connection, then refresh upload status."));
    request.ontimeout = () => finish(new Error("The transfer timed out. Refresh upload status before restarting."));
    request.onabort = () => finish(new DOMException("Upload cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    request.send(file);
  });
}
