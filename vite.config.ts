import { defineConfig } from "vite";

// Same path table as nginx/default.conf.template: everything HA-owned is proxied so HA is same-origin.
const HA_URL = process.env.HA_URL ?? "http://homeassistant.local:8123";
const haPaths = ["/api", "/auth", "/static", "/frontend_latest", "/frontend_es5", "/local", "/hacsfiles", "/.well-known"];

export default defineConfig({
  build: { target: "ios15" },
  server: {
    host: true,
    proxy: Object.fromEntries(haPaths.map((p) => [p, { target: HA_URL, changeOrigin: true, ws: true }])),
  },
});
