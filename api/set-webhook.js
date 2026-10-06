export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "BOT_TOKEN environment variable is missing"
    });
  }

  const webhookUrl =
    "https://sumit-ffstore-five.vercel.app/api/telegram-webhook";

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      }
    );

    const data = await response.json();

    return res.status(response.ok ? 200 : 500).json({
      success: response.ok,
      webhookUrl,
      telegram: data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}