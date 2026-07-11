// netlify/functions/shirts.js
//
// Manages the shirts list using JSONBin as storage (server-side only --
// the JSONBin key never reaches the browser, since this function runs
// on Netlify's servers).
//
// GET  -> returns the current list of shirts
// POST -> body: { password, action: "replace", shirts: [...] }

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

      record.shirts = body.shirts || [];

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
