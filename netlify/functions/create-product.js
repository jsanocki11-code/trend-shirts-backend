// netlify/functions/create-product.js
//
// Creates a real product in the Shopify store via the Admin API, then
// saves it to the shirts list. This is what "Use This" calls.

const SHOP_DOMAIN = "theshop-10108.myshopify.com";
const CLIENT_ID = "060e56fadeb1a5f18e298ef4ff12c26f";
const CLIENT_SECRET = "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";
const API_VERSION = "2025-01";

const JSONBIN_BIN_ID = "6a52586ada38895dfe4f9c08";
const JSONBIN_API_KEY = "$2a$10$1fQ9hOQqwYeFflvLWPWxee1K/rE2xgS3SnjoUj5bzcS6tHycI8RAO";
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Token fetch failed: " + res.status + " " + text);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("No access_token in response: " + JSON.stringify(data));
  }
  return data.access_token;
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }

  const debugLog = [];

  try {
    const body = JSON.parse(event.body || "{}");
    if (body.password !== ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong password" }) };
    }

    const title = (body.title || "Untitled Drop").trim();
    const price = "19.99";

    debugLog.push("Fetching access token...");
    const token = await getAccessToken();
    debugLog.push("Got token.");

    debugLog.push("Creating Shopify product...");
    const productRes = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/products.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          product: {
            title: title,
            body_html: `<p>This week's drop, inspired by what's trending right now.</p>`,
            vendor: "Trending Shirts",
            product_type: "T-Shirt",
            status: "active",
            variants: [{ price: price }],
          },
        }),
      }
    );

    const productData = await productRes.json();
    debugLog.push("Product API status: " + productRes.status);

    if (!productRes.ok || !productData.product) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Shopify did not create the product.",
          detail: productData,
          debugLog,
        }),
      };
    }

    const product = productData.product;
    const productUrl = `https://${SHOP_DOMAIN}/products/${product.handle}`;
    const image = product.image ? product.image.src : "";

    const newShirt = {
      title: title,
      price: `$${price}`,
      image: image,
      link: productUrl,
    };
    debugLog.push("Product created: " + productUrl);

    // Save to the shirts list stored in JSONBin
    const binUrl = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    debugLog.push("Fetching current bin state...");
    const currentRes = await fetch(binUrl + "/latest", {
      headers: { "X-Master-Key": JSONBIN_API_KEY },
    });

    if (!currentRes.ok) {
      const errText = await currentRes.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Product was created in Shopify, but could not read storage to save it to the site.",
          detail: errText,
          productUrl,
          debugLog,
        }),
      };
    }

    const currentData = await currentRes.json();
    const record = currentData.record || {};
    record.shirts = [...(record.shirts || []), newShirt];
    debugLog.push("Writing updated bin with " + record.shirts.length + " shirts...");

    const putRes = await fetch(binUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
      },
      body: JSON.stringify(record),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Product was created in Shopify, but saving it to the site's list failed.",
          detail: errText,
          putStatus: putRes.status,
          productUrl,
          debugLog,
        }),
      };
    }

    debugLog.push("Saved successfully.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ shirt: newShirt, shirts: record.shirts, debugLog }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Could not create product.", detail: String(err), debugLog }),
    };
  }
};
