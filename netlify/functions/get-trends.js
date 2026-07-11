// netlify/functions/get-trends.js
//
// Server-side fetch of trending topics from RSS feeds (ESPN for sports,
// BBC for news, Entertainment Weekly for pop culture). RSS feeds are
// built for automated fetching, unlike Reddit's API which blocks a lot
// of cloud-hosting IP ranges (including Netlify's).

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const sources = [
    { name: "Sports", url: "https://www.espn.com/espn/rss/news" },
    { name: "News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
    { name: "Pop Culture", url: "https://ew.com/feed/" },
  ];

  try {
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const res = await fetch(source.url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; trend-shirt-app/1.0)" },
          });
          const xml = await res.text();
          const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
            .map((m) => m[1].trim())
            .filter((t) => t && !t.toLowerCase().includes("espn.com") && t.toLowerCase() !== "bbc news")
            .slice(0, 5);
          return { name: source.name, posts: titles };
        } catch (err) {
          return { name: source.name, posts: [] };
        }
      })
    );

    return { statusCode: 200, headers, body: JSON.stringify({ results }) };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Could not fetch trends right now." }),
    };
  }
};
