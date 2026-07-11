// netlify/functions/upload-image.js
//
// Uploads an image (sent as base64 from the browser) directly to a
// Shopify product as its product image, via the Admin API.

const SHOP_DOMAIN = "theshop-10108.myshopify.com";
const CLIENT_ID = "060e56fadeb1a5f18e298ef4ff12c26f";
const CLIENT_SECRET = "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";
const API_VERSION = "2025-01";
const ADMIN_PASSWORD = "apache";

async function getAccessToken() {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    if (body.password !== ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong password" }) };
    }

    const { productId, imageBase64 } = body;
    if (!productId || !imageBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing productId or image data" }) };
    }

    // Strip the "data:image/png;base64," prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const token = await getAccessToken();

    const res = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/products/${productId}/images.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ image: { attachment: cleanBase64 } }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.image) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Shopify did not accept the image.", detail: data }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl: data.image.src }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Upload failed.", detail: String(err) }) };
  }
};
