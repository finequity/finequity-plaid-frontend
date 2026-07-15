/**
 * Mint a proof URL for local testing — mirrors the Glide JavaScript column.
 *
 * Usage:
 *   node dev-url.mjs <userSecret> <uid> [appOrigin]
 *
 * <userSecret> must match what was provisioned for <uid> (see README:
 * "Local testing"). Prints a URL with the #uid=..&ts=..&proof=.. fragment.
 */
import crypto from "node:crypto";

const [userSecret, uid, origin = "http://localhost:3000"] = process.argv.slice(2);

if (!userSecret || !uid) {
    console.error("Usage: node dev-url.mjs <userSecret> <uid> [appOrigin]");
    process.exit(1);
}

const ts = Date.now();
const proof = crypto.createHash("sha256").update(`${userSecret}:${uid}:${ts}`).digest("hex");

console.log(`${origin}/#uid=${encodeURIComponent(uid)}&ts=${ts}&proof=${proof}`);
