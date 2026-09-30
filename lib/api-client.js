"use client";
import axios from "axios";

// Every request goes to our own /api routes, so a relative baseURL is enough (same-origin cookies apply automatically).
export const api = axios.create({ baseURL: "/api", timeout: 20000 });

// Turns any axios error (validation error, network failure, or a Blob body from a file download
// gone wrong) into one readable string for the UI.
export async function getErrorMessage(err) {
  if (err?.response) {
    const data = err.response.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      try { return JSON.parse(await data.text())?.error || "Something went wrong."; }
      catch { return "Something went wrong."; }
    }
    return data?.error || `Request failed (${err.response.status}).`;
  }
  if (err?.request) return "Couldn't reach the server. Check your connection and try again.";
  return err?.message || "Something went wrong.";
}

// Downloads a file-returning endpoint (like /reports) via axios instead of a plain <a href>,
// so a failed download surfaces a real error message instead of the browser opening a blank/JSON page.
export async function downloadFile(url, params) {
  const res = await api.get(url, { params, responseType: "blob" });
  const cd = res.headers["content-disposition"] || "";
  const filename = /filename="?([^"]+)"?/.exec(cd)?.[1] || "report.xlsx";
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
