const { Redis } = require("@upstash/redis");

const SITE_URL = "https://www.h2odirectnow.com/";
const NTFY_TOPIC = "h20-alert-20111";
const STATE_KEY = "monitor:state";

function hasRedisEnv() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

function getRedis() {
  if (!hasRedisEnv()) return null;
  return Redis.fromEnv();
}

async function loadState() {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get(STATE_KEY)) || null;
}

async function saveState(state) {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      "Redis env vars missing. Add Upstash Redis in Vercel Storage, then redeploy so KV_REST_API_URL and KV_REST_API_TOKEN are set."
    );
  }
  await redis.set(STATE_KEY, state);
}

async function checkSite() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(SITE_URL, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "H2O-Website-Monitor/1.0" },
    });
    clearTimeout(timeout);
    const up = res.status >= 200 && res.status < 400;
    return { up, statusCode: res.status, error: null };
  } catch (err) {
    clearTimeout(timeout);
    return { up: false, statusCode: null, error: err.message || "Request failed" };
  }
}

async function sendNtfy(title, message, priority = "default") {
  const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: "POST",
    headers: {
      Title: title,
      Priority: priority,
    },
    body: message,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ntfy error ${res.status}${text ? `: ${text}` : ""}`);
  }
}

async function runCheck({ notifyOnChange = true } = {}) {
  const stored = await loadState();
  const result = await checkSite();
  const status = result.up ? "up" : "down";
  const lastStatus = stored?.status ?? null;
  const changed = lastStatus !== null && lastStatus !== status;
  const firstCheckDown = lastStatus === null && status === "down";

  const state = {
    url: SITE_URL,
    status,
    lastCheck: new Date().toISOString(),
    lastError: result.error,
    lastStatusCode: result.statusCode,
    intervalMinutes: 30,
    ntfyTopic: NTFY_TOPIC,
  };

  if (notifyOnChange && (changed || firstCheckDown)) {
    if (status === "down") {
      await sendNtfy(
        "H2O site is DOWN",
        `${SITE_URL} is down.${result.error ? ` ${result.error}` : ""} HTTP: ${result.statusCode ?? "n/a"}`,
        "urgent"
      );
    } else {
      await sendNtfy(
        "H2O site is back UP",
        `${SITE_URL} is online again. HTTP ${result.statusCode}`,
        "default"
      );
    }
  }

  await saveState(state);
  return state;
}

async function getStatus() {
  const stored = await loadState();
  if (stored) return stored;
  return {
    url: SITE_URL,
    status: null,
    lastCheck: null,
    lastError: null,
    lastStatusCode: null,
    intervalMinutes: 30,
    ntfyTopic: NTFY_TOPIC,
  };
}

module.exports = {
  SITE_URL,
  NTFY_TOPIC,
  checkSite,
  sendNtfy,
  runCheck,
  getStatus,
};
