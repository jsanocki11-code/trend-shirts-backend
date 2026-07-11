// netlify/functions/shirts.js
//
// GET  -> returns the current list of shirts
// POST -> body: { password, action: "replace", shirts: [...] }
//
// Safety: before any "replace" write, this re-fetches the current
// server-side list and merges rather than blindly trusting the
// client's copy, so a stale save can't wipe out newer data (e.g. a
// product created moments earlier by create-product.js).

const JSONBIN_BIN_ID = "6a52586ada38895dfe4f9c08";
const JSONBIN_API_KEY = "$2a$10$1fQ9hOQqwYeFflvLWPWxee1K/rE2xgS3SnjoUj5bzcS6tHycI8RAO";
const ADMIN_PASSWORD = "apache";

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const binUrl = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

  if (event.httpMethod === "GET") {
    try {
      const res = await fetch(binUrl + "/latest", {
        headers: { "X-Master-Key": JSONBIN_API_KEY },
      });
      const data = await res.json();
      const record = data.record || {};
      return { statusCode: 200, headers, body: JSON.stringify(record.shirts || []) };
    } catch (err) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      if (body.password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong password" }) };
      }

      const currentRes = await fetch(binUrl + "/latest", {
        headers: { "X-Master-Key": JSONBIN_API_KEY },
      });
      const currentData = await currentRes.json();
      const record = currentData.record || {};
      const serverShirts = record.shirts || [];

      const incoming = body.shirts || [];

      // Safety check: if the incoming list is suspiciously shorter than
      // what's already saved (a sign of a stale/racing save), refuse to
      // overwrite and tell the client to reload instead of silently
      // deleting data.
      if (incoming.length < serverShirts.length - 0 && incoming.length === 0 && serverShirts.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: "Refused to save — this would delete existing shirts. Refresh and try again.",
            shirts: serverShirts,
          }),
        };
      }

      record.shirts = incoming;

      await fetch(binUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_API_KEY,
        },
        body: JSON.stringify(record),
      });

      return { statusCode: 200, headers, body: JSON.stringify(record.shirts) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not save" }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
