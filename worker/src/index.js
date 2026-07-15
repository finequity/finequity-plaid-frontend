/**
 * Cloudflare Worker: authenticated gateway between the Glide-embedded React
 * frontend and the Pipedream triggers.
 *
 * Auth model (per-user proof, no shared link secret):
 *   - Glide provisions each user once: POST /provision/<PROVISION_PATH_KEY>
 *     with { userId, userSecret } → stored in USERS KV as user:<uid>.
 *   - Glide computes proof = SHA-256(`${userSecret}:${uid}:${ts}`) and embeds
 *     #uid=..&ts=..&proof=.. in the webview URL (URL fragment — never sent to
 *     any server or logged).
 *   - This Worker recomputes the proof from the stored secret and rejects
 *     anything stale (> PROOF_WINDOW_MS old) or mismatched.
 *
 * Routes:
 *   POST /provision/<key>   { userId, userSecret }   (Glide webhook)
 *   GET  /transactions?uid=&ts=&proof=               (recurring data, KV-cached)
 *   POST /api/exchange      { uid, ts, proof, publicToken }  (Plaid exchange)
 *
 * Data responses mirror Pipedream's shape ({ response_object: { tag, data } })
 * so the frontend handles cache hits and live fetches identically.
 */

const enc = new TextEncoder();

// Glide's Current Date/Time column doesn't tick every second, so the ts in a
// freshly-opened webview can already be minutes old. 15 min balances that
// slack against how long a leaked URL stays usable.
const PROOF_WINDOW_MS = 15 * 60 * 1000;

// ── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = (env) => ({
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
});

const json = (obj, status, env) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders(env) },
    });

// ── Proof verification ──────────────────────────────────────────────────────

async function sha256Hex(s) {
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string comparison (proof is attacker-supplied).
function timingSafeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

/**
 * USERS KV record for a provisioned user: { secret, phoneNumber }.
 * Tolerates legacy plain-string records (secret only, no phone).
 */
async function getUser(env, uid) {
    const raw = await env.USERS.get(`user:${uid}`);
    if (!raw) return null;
    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && obj.secret) return obj;
    } catch { }
    return { secret: raw, phoneNumber: null };
}

/**
 * Returns the user record when the proof checks out, null otherwise —
 * handlers need the record anyway (phoneNumber) so verification hands it over.
 */
async function verifyProof(env, uid, ts, proof) {
    if (!uid || !ts || !proof) return null;
    if (!/^\d+$/.test(String(ts))) return null;
    if (Math.abs(Date.now() - Number(ts)) > PROOF_WINDOW_MS) return null;

    const user = await getUser(env, uid);
    if (!user) return null; // unknown / unprovisioned user

    const expected = await sha256Hex(`${user.secret}:${uid}:${ts}`);
    return timingSafeEqual(String(proof).toLowerCase(), expected) ? user : null;
}

// ── US phone normalization ──────────────────────────────────────────────────
// Glide may send "415-555-1234", "(415) 555-1234", "+14155551234", etc.
// Normalize to E.164 ("+1XXXXXXXXXX"); null when not a valid 10-digit US number.
function toE164US(raw) {
    if (raw == null) return null;
    let digits = String(raw).replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length !== 10) return null;
    return `+1${digits}`;
}

// ── Provisioning (Glide webhook) ────────────────────────────────────────────

async function handleProvision(request, env, pathKey) {
    // The path segment is the shared secret; wrong key looks like a 404.
    if (!env.PROVISION_PATH_KEY || pathKey !== env.PROVISION_PATH_KEY) {
        return json({ error: "Not found" }, 404, env);
    }

    const body = await request.json().catch(() => null);
    // Glide's Trigger Webhook wraps values; accept the shapes it's known to
    // send ({ params: { name: value } } or { params: { name: { value } } }).
    const src = body?.params ?? body?.body ?? body ?? {};
    const pick = (v) => (v && typeof v === "object" && "value" in v ? v.value : v);
    const userId = pick(src.userId);
    const userSecret = pick(src.userSecret);
    const phoneNumber = toE164US(pick(src.phoneNumber));

    if (!userId || !userSecret) {
        // Calibration aid (see README): shows the exact shape Glide sent.
        console.log("provision: unrecognized body shape:", JSON.stringify(body));
        return json({ error: "Missing userId/userSecret" }, 400, env);
    }
    if (!phoneNumber) {
        // Rejecting here surfaces bad Glide data at provisioning time, where
        // wrangler tail makes it visible — not as a mystery Pipedream failure.
        console.log("provision: missing/invalid phoneNumber for", userId);
        return json({ error: "Missing or invalid phoneNumber" }, 400, env);
    }

    await env.USERS.put(`user:${userId}`, JSON.stringify({ secret: String(userSecret), phoneNumber }));
    return json({ ok: true }, 200, env);
}

// ── Cache + Pipedream ───────────────────────────────────────────────────────

const txKey = (uid) => `tx:${uid}`;

async function cacheRecurringData(env, uid, upstream) {
    // Only cache real recurring data — never link_tokens or errors.
    if (upstream?.response_object?.tag === "recurring_data" && upstream.response_object.data) {
        await env.CACHE.put(txKey(uid), JSON.stringify(upstream.response_object.data), {
            expirationTtl: Number(env.CACHE_TTL_SECONDS) || 604800,
        });
    }
}

async function callPipedream(env, url, token, payload) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
    // Optional second factor for Pipedream's own check (x-gateway-secret step).
    if (env.PIPEDREAM_SECRET) headers["x-gateway-secret"] = env.PIPEDREAM_SECRET;

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    return res.json();
}

async function handleTransactions(uid, user, env) {
    const cached = await env.CACHE.get(txKey(uid), "json");
    if (cached) {
        return json({ response_object: { tag: "recurring_data", data: cached } }, 200, env);
    }

    // Cache miss: the phone number provisioned alongside the user's secret
    // rides along to Pipedream. It never appears in any URL or browser.
    const upstream = await callPipedream(
        env,
        env.RETRIEVE_TRIGGER_URL,
        env.RETRIEVE_TRIGGER_AUTH_TOKEN,
        { userId: uid, phoneNumber: user.phoneNumber }
    );
    await cacheRecurringData(env, uid, upstream);
    return json(upstream, 200, env);
}

async function handleExchange(body, user, env) {
    const { uid, publicToken } = body;
    if (!publicToken) return json({ error: "Missing publicToken" }, 400, env);

    const upstream = await callPipedream(
        env,
        env.EXCHANGE_TRIGGER_URL,
        env.EXCHANGE_TRIGGER_AUTH_TOKEN,
        { publicToken, userId: uid, phoneNumber: user.phoneNumber }
    );
    await cacheRecurringData(env, uid, upstream);
    return json(upstream, 200, env);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders(env) });
        }

        const { pathname, searchParams } = new URL(request.url);

        try {
            const provision = pathname.match(/^\/provision\/([^/]+)$/);
            if (provision && request.method === "POST") {
                return await handleProvision(request, env, provision[1]);
            }

            if (pathname === "/transactions" && request.method === "GET") {
                const uid = searchParams.get("uid");
                const ts = searchParams.get("ts");
                const proof = searchParams.get("proof");
                const user = await verifyProof(env, uid, ts, proof);
                if (!user) return json({ error: "Invalid or expired proof" }, 401, env);
                return await handleTransactions(uid, user, env);
            }

            if (pathname === "/api/exchange" && request.method === "POST") {
                const body = await request.json().catch(() => null);
                if (!body) return json({ error: "Invalid JSON body" }, 400, env);
                const user = await verifyProof(env, body.uid, body.ts, body.proof);
                if (!user) return json({ error: "Invalid or expired proof" }, 401, env);
                return await handleExchange(body, user, env);
            }

            return json({ error: "Not found" }, 404, env);
        } catch (err) {
            console.error(err);
            return json({ error: "Upstream request failed" }, 502, env);
        }
    },
};
