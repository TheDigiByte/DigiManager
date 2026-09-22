import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Bypass ngrok browser warning page for fetch requests in the desktop app
const originalFetch = window.fetch;
window.fetch = function (input: any, init: any) {
  const newInit = init ? { ...init } : {};

  if (newInit.headers instanceof Headers) {
    const newHeaders = new Headers(newInit.headers);
    newHeaders.set("ngrok-skip-browser-warning", "true");
    newInit.headers = newHeaders;
  } else if (Array.isArray(newInit.headers)) {
    const newHeaders = [...newInit.headers];
    const hasHeader = newHeaders.some(([k]) => k.toLowerCase() === "ngrok-skip-browser-warning");
    if (!hasHeader) {
      newHeaders.push(["ngrok-skip-browser-warning", "true"]);
    }
    newInit.headers = newHeaders;
  } else if (newInit.headers && typeof newInit.headers === "object") {
    newInit.headers = {
      ...newInit.headers,
      "ngrok-skip-browser-warning": "true"
    };
  } else {
    newInit.headers = { "ngrok-skip-browser-warning": "true" };
  }

  return originalFetch(input, newInit);
};


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
