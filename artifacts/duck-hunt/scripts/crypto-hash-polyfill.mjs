// Polyfill for crypto.hash(), added in Node 21.7 / 20.12 but missing in Node 21.5.
// Vite 7 relies on it. Loaded via NODE_OPTIONS --import. Safe to remove once
// this machine runs Node 20.19+ or 22.12+.
import crypto from "node:crypto";

if (typeof crypto.hash !== "function") {
  crypto.hash = (algorithm, data, outputEncoding = "hex") => {
    const h = crypto.createHash(algorithm).update(data);
    return outputEncoding === "buffer" ? h.digest() : h.digest(outputEncoding);
  };
}
