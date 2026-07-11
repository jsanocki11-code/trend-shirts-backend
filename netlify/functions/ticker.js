// netlify/functions/ticker.js
//
// Manages the ticker topics list using Netlify Blobs.
//
// GET  -> returns the current ticker topics list
// POST -> body: { password, topics: [...] }

const { getStore } = require("@netlify/blobs");

const SITE_ID = "db1bf317-100c-4d1c-ad9e-001b676bb0e0";
const BLOBS_TOKEN = "nfp_jWuqKbr8ekWyqm5nydrymtaw1HC2vLpAd4d3";
const ADMIN_PASSWORD = "apache";

const DEFAULT_TOPICS = [
  "WORLD CUP FEVER",
  "HOT DOG SUMMER",
  "NEW MUSIC FRIDAY",
  "SUMMER BLOCKBUSTER SZN",
  "MAJORS SEASON",
];

function store() {
  return getStore({ name: "trend-shirts", siteID: SITE_ID, token: BLOBS_TOKEN });
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    try {
      const topics = (await store().get("ticker", { type: "json" })) || DEFAULT_TOPICS;
      return { statusCode: 200, headers, body: JSON.stringify(topics) };
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
      await store().setJSON("ticker", body.topics || []);
      return { statusCode: 200, headers, body: JSON.stringify(body.topics) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not save", detail: String(err) }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
