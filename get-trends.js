// netlify/functions/shirts.js
//
// GET  -> returns the current list of shirts
// POST -> body: { action: "add", shirt: {...} } or { action: "remove", index: N }
//         or { action: "replace", shirts: [...] }
// All changes save immediately -- no download/upload step needed.

const { getStore } = require("@netlify/blobs");

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

  const store = getStore("trend-shirts");

  if (event.httpMethod === "GET") {
    const list = (await store.get("shirts", { type: "json" })) || [];
    return { statusCode: 200, headers, body: JSON.stringify(list) };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");

      if (body.password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong password" }) };
      }

      let list = (await store.get("shirts", { type: "json" })) || [];

      if (body.action === "add") {
        list.push(body.shirt);
      } else if (body.action === "remove") {
        list.splice(body.index, 1);
      } else if (body.action === "replace") {
        list = body.shirts;
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
      }

      await store.setJSON("shirts", list);
      return { statusCode: 200, headers, body: JSON.stringify(list) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not save" }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
