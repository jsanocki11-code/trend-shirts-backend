// netlify/functions/get-trends.js
//
// Server-side fetch of trending topics from sports/news/pop-culture
// subreddits. Runs on Netlify's servers, not the visitor's browser, so
// there's no CORS/CSP issue and no exposed keys.

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
    { name: "Sports", subreddit: "sports" },
    { name: "NFL", subreddit: "nfl" },
    { name: "News", subreddit: "news" },
    { name: "Pop Culture", subreddit: "popculturechat" },
  ];

  try {
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const res = await fetch(
            `https://www.reddit.com/r/${source.subreddit}/hot.json?limit=5&raw_json=1`,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              },
            }
          );
          const data = await res.json();
          const posts = (data.data?.children || [])
            .map((p) => p.data.title)
            .filter(Boolean);
          return { name: source.name, posts };
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
