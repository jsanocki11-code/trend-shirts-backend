// netlify/functions/shirts.js
//
// Manages the shirts list using Netlify Blobs (built-in storage),
// configured explicitly with Site ID + token so it works reliably
// regardless of deploy context.
//
// GET  -> returns the current list of shirts
// POST -> body: { password, action: "replace", shirts: [...] }

const { getStore } = require("@netlify/blobs");

const SITE_ID = "db1bf317-100c-4d1c-ad9e-001b676bb0e0";
const BLOBS_TOKEN = "nfp_jWuqKbr8ekWyqm5nydrymtaw1HC2vLpAd4d3";
const ADMIN_PASSWORD = "apache";

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
      const list = (await store().get("shirts", { type: "json" })) || [];
      return { statusCode: 200, headers, body: JSON.stringify(list) };
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

      const incoming = body.shirts || [];
      const current = (await store().get("shirts", { type: "json" })) || [];

      if (incoming.length === 0 && current.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: "Refused to save — this would delete existing shirts. Refresh and try again.",
            shirts: current,
          }),
        };
      }

      await store().setJSON("shirts", incoming);
      return { statusCode: 200, headers, body: JSON.stringify(incoming) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not save", detail: String(err) }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
