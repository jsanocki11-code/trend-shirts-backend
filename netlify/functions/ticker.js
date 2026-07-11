// netlify/functions/ticker.js
//
// Manages the ticker topics list using JSONBin (same bin as shirts.js,
// different key inside the stored object).
//
// GET  -> returns the current ticker topics list (array of strings)
// POST -> body: { password, topics: [...] }

const JSONBIN_BIN_ID = "6a52586ada38895dfe4f9c08";
const JSONBIN_API_KEY = "$2a$10$1fQ9hOQqwYeFflvLWPWxee1K/rE2xgS3SnjoUj5bzcS6tHycI8RAO";
const ADMIN_PASSWORD = "apache";

const DEFAULT_TOPICS = [
  "WORLD CUP FEVER",
  "HOT DOG SUMMER",
  "NEW MUSIC FRIDAY",
  "SUMMER BLOCKBUSTER SZN",
  "MAJORS SEASON",
];

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
      return { statusCode: 200, headers, body: JSON.stringify(record.ticker || DEFAULT_TOPICS) };
    } catch (err) {
      return { statusCode: 200, headers, body: JSON.stringify(DEFAULT_TOPICS) };
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

      record.ticker = body.topics || [];

      await fetch(binUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_API_KEY,
        },
        body: JSON.stringify(record),
      });

      return { statusCode: 200, headers, body: JSON.stringify(record.ticker) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not save" }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
