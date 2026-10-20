import React from "react";
import { createRoot } from "react-dom/client";
import App from "./Shell.jsx";
import "./styles.css";
import "./operations.css";
import "./admin.css";
import "./public-panels.css";
import "./operations-responsive.css";
import "./readability.css";
import { allImages } from "./media.js";
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(async (registration) => {
      await navigator.serviceWorker.ready;
      const paths = [...document.querySelectorAll("script[src],link[href]")]
        .map((el) => new URL(el.src || el.href, location.href).pathname)
        .filter((p) => p.startsWith("/assets/"));
      (
        registration.active ||
        registration.waiting ||
        registration.installing
      )?.postMessage({ type: "CACHE_ASSETS", paths: [...paths, ...allImages] });
    })
    .catch(() => {});
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
