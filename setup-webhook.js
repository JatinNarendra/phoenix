const https = require("https");

// Bot configuration
const BOT_TOKEN = "8153450520:AAE31uukI1RPDFFwDZAnhEQXMTOPjJ2E9eE";
const WEBHOOK_URL = "https://sparky-kappa.vercel.app/api/payments/webhook";
const WEBHOOK_SECRET = "dbde5a346ebf238833436c7ffde34383";

async function setWebhook() {
  const webhookData = {
    url: WEBHOOK_URL,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["pre_checkout_query", "message"],
  };

  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: `/bot${BOT_TOKEN}/setWebhook`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(JSON.stringify(webhookData));
    req.end();
  });
}

async function getWebhookInfo() {
  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: `/bot${BOT_TOKEN}/getWebhookInfo`,
    method: "GET",
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  try {
    console.log("🔧 Setting up webhook...");
    console.log("Bot Token:", BOT_TOKEN.substring(0, 10) + "...");
    console.log("Webhook URL:", WEBHOOK_URL);
    console.log("Secret Token:", WEBHOOK_SECRET.substring(0, 10) + "...");

    // Set webhook
    const setResult = await setWebhook();
    console.log("\n📡 Webhook Setup Result:");
    console.log(JSON.stringify(setResult, null, 2));

    if (setResult.ok) {
      console.log("\n✅ Webhook set successfully!");
    } else {
      console.log("\n❌ Failed to set webhook:", setResult.description);
    }

    // Get webhook info
    console.log("\n🔍 Getting webhook info...");
    const infoResult = await getWebhookInfo();
    console.log("\n📊 Current Webhook Info:");
    console.log(JSON.stringify(infoResult, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
