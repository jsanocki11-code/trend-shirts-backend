// netlify/functions/ticker.js
//
// GET  -> returns the current ticker topics list (array of strings)
// POST -> body: { password, topics: [...] } replaces the whole list

const { getStore } = require("@netlify/blobs");

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

  const store = getStore("trend-shirts");

  if (event.httpMethod === "GET") {
    const topics = (await store.get("ticker", { type: "json" })) || DEFAULT_TOPICS;
    return { statusCode: 200, headers, body: JSON.stringify(topics) };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      if (body.password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong password" }) };
      }
      await store.setJSON("ticker", body.topics || []);
      return { statusCode: 200, headers, body: JSON.stringify(body.topics) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not save" }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
