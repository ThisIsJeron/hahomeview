// Onboards the throwaway demo HA (dev/demo-ha.sh) and puts demo entities into areas with a "Favorite" label.
// Node 22+ (global fetch + WebSocket). Credentials are written to dev/.ha-demo.env.
import { createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
import { writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const HA = process.env.HA_URL ?? "http://localhost:8123";
const CLIENT = "http://localhost:8099/";
const ENV = new URL("./.ha-demo.env", import.meta.url);
const json = (r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(new Error(`${r.status} ${r.url}: ${t}`))));

async function onboard() {
  const user = { name: "Demo", username: "demo", password: randomBytes(9).toString("base64url"), language: "en", client_id: CLIENT };
  const { auth_code } = await fetch(`${HA}/api/onboarding/users`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(user) }).then(json);
  const tok = await fetch(`${HA}/auth/token`, { method: "POST", body: new URLSearchParams({ grant_type: "authorization_code", code: auth_code, client_id: CLIENT }) }).then(json);
  const h = { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" };
  await fetch(`${HA}/api/onboarding/core_config`, { method: "POST", headers: h, body: "{}" }).then(json);
  await fetch(`${HA}/api/onboarding/analytics`, { method: "POST", headers: h, body: "{}" }).then(json);
  await fetch(`${HA}/api/onboarding/integration`, { method: "POST", headers: h, body: JSON.stringify({ client_id: CLIENT, redirect_uri: CLIENT }) }).then(json);
  writeFileSync(ENV, `HA_DEMO_USER=${user.username}\nHA_DEMO_PASSWORD=${user.password}\nHA_DEMO_TOKEN=${tok.access_token}\n`);
  console.log("Onboarded; credentials in dev/.ha-demo.env");
  return tok.access_token;
}

const steps = await fetch(`${HA}/api/onboarding`).then(json);
let token;
if (steps.some((s) => !s.done)) token = await onboard();
else token = Object.fromEntries(readFileSync(ENV, "utf8").split("\n").filter(Boolean).map((l) => l.split("="))).HA_DEMO_TOKEN;

const conn = await createConnection({ auth: createLongLivedTokenAuth(HA, token) });
if (!readFileSync(ENV, "utf8").includes("HA_DEMO_LL_TOKEN")) {
  const ll = await conn.sendMessagePromise({ type: "auth/long_lived_access_token", client_name: "seed", lifespan: 3650 });
  writeFileSync(ENV, readFileSync(ENV, "utf8").replace(/HA_DEMO_TOKEN=.*\n/, `HA_DEMO_TOKEN=${ll}\nHA_DEMO_LL_TOKEN=1\n`));
}
const areas = await conn.sendMessagePromise({ type: "config/area_registry/list" });
const entities = await conn.sendMessagePromise({ type: "config/entity_registry/list" });
const WANT = new Set(["light", "switch", "cover", "lock", "fan", "climate", "camera", "media_player", "scene", "binary_sensor", "vacuum", "humidifier"]);
let i = 0;
const doneDevices = new Set();
for (const e of entities) {
  if (!WANT.has(e.entity_id.split(".")[0]) || e.entity_category) continue;
  // HA rule: an entity owned by a device takes the device's area.
  if (e.device_id) {
    if (doneDevices.has(e.device_id)) continue;
    doneDevices.add(e.device_id);
    await conn.sendMessagePromise({ type: "config/device_registry/update", device_id: e.device_id, area_id: areas[i++ % areas.length].area_id });
  } else {
    await conn.sendMessagePromise({ type: "config/entity_registry/update", entity_id: e.entity_id, area_id: areas[i++ % areas.length].area_id });
  }
}
const labels = await conn.sendMessagePromise({ type: "config/label_registry/list" });
if (!labels.some((l) => l.label_id === "favorite")) await conn.sendMessagePromise({ type: "config/label_registry/create", name: "Favorite", icon: "mdi:star" });
for (const id of ["light.ceiling_lights", "lock.front_door", "scene.romantic_lights", "cover.garage_door"]) {
  await conn.sendMessagePromise({ type: "config/entity_registry/update", entity_id: id, labels: ["favorite"] }).catch(() => {});
}
console.log(`Seeded ${i} entities across ${areas.map((a) => a.name).join(", ")}`);
conn.close();
