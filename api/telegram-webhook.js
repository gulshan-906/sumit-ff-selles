import {
  initializeApp,
  cert,
  getApps
} from "firebase-admin/app";

import {
  getFirestore,
  Timestamp
} from "firebase-admin/firestore";


// =====================================
// FIREBASE ADMIN
// =====================================

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, "\n")
    })
  });
}

const db = getFirestore();


// =====================================
// TELEGRAM WEBHOOK
// =====================================

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // -----------------------------------
    // OPTIONAL WEBHOOK SECURITY
    // -----------------------------------

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (secret) {
      const receivedSecret =
        req.headers["x-telegram-bot-api-secret-token"];

      if (receivedSecret !== secret) {
        return res.status(401).json({
          error: "Unauthorized"
        });
      }
    }


    // -----------------------------------
    // READ TELEGRAM UPDATE
    // -----------------------------------

    let update = req.body;

    if (typeof update === "string") {
      try {
        update = JSON.parse(update);
      } catch {
        return res.status(400).json({
          error: "Invalid JSON"
        });
      }
    }


    const callback = update?.callback_query;

    if (!callback) {
      return res.status(200).json({
        success: true
      });
    }


    const callbackData =
      String(callback.data || "");

    const parts = callbackData.split(":");


    if (
      parts.length !== 3 ||
      parts[0] !== "status"
    ) {

      await answerCallback(
        callback.id,
        "❌ Invalid button."
      );

      return res.status(200).json({
        success: true
      });
    }


    const orderId = parts[1];
    const newStatus = parts[2];


    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
      "delivered"
    ];


    if (!allowedStatuses.includes(newStatus)) {

      await answerCallback(
        callback.id,
        "❌ Invalid status."
      );

      return res.status(400).json({
        error: "Invalid status"
      });
    }


    // -----------------------------------
    // FIRESTORE ORDER
    // -----------------------------------

    const orderRef = db
      .collection("orders")
      .doc(orderId);

    const orderSnap =
      await orderRef.get();


    if (!orderSnap.exists) {

      await answerCallback(
        callback.id,
        "❌ Order not found."
      );

      return res.status(404).json({
        error: "Order not found"
      });
    }


    const order = orderSnap.data();

    const currentStatus =
      String(
        order.status || "pending"
      ).toLowerCase();


    // -----------------------------------
    // STATUS RULES
    // -----------------------------------

    if (currentStatus === "delivered") {

      await answerCallback(
        callback.id,
        "📦 Already delivered."
      );

      return res.status(200).json({
        success: true
      });
    }


    if (
      currentStatus === "approved" &&
      newStatus === "rejected"
    ) {

      await answerCallback(
        callback.id,
        "⚠️ Approved order cannot be rejected."
      );

      return res.status(200).json({
        success: true
      });
    }


    if (
      currentStatus === "rejected" &&
      newStatus === "approved"
    ) {

      await answerCallback(
        callback.id,
        "⚠️ Rejected order cannot be approved."
      );

      return res.status(200).json({
        success: true
      });
    }


    // -----------------------------------
    // FIRESTORE UPDATE
    // -----------------------------------

    const updateData = {
      status: newStatus,
      updatedAt: Timestamp.now()
    };


    if (newStatus === "approved") {
      updateData.approvedAt = Timestamp.now();
    }


    if (newStatus === "rejected") {
      updateData.rejectedAt = Timestamp.now();

      updateData.rejectionReason =
        "Payment rejected by admin.";
    }


    if (newStatus === "delivered") {
      updateData.deliveredAt = Timestamp.now();
    }


    await orderRef.update(updateData);


    // -----------------------------------
    // STATUS TEXT
    // -----------------------------------

    let statusText =
      "🟡 UNDER VERIFICATION";


    if (newStatus === "approved") {
      statusText =
        "🟢 PAYMENT VERIFIED";
    }


    if (newStatus === "rejected") {
      statusText =
        "🔴 PAYMENT REJECTED";
    }


    if (newStatus === "delivered") {
      statusText =
        "📦 ID DELIVERED";
    }


    // -----------------------------------
    // TELEGRAM BUTTON FEEDBACK
    // -----------------------------------

    await answerCallback(
      callback.id,
      statusText
    );


    // -----------------------------------
    // UPDATE TELEGRAM MESSAGE
    // -----------------------------------

    const BOT_TOKEN =
      process.env.BOT_TOKEN;

    const chatId =
      callback.message?.chat?.id;

    const messageId =
      callback.message?.message_id;


    if (
      BOT_TOKEN &&
      chatId &&
      messageId
    ) {

      const updatedText =
`🛒 FF ID ORDER

🎮 FF ID: ${order.account || ""}
💰 Amount: ₹${order.amount || 0}
📱 Mobile: ${order.phone || ""}

🔢 UTR: ${order.utr || ""}

${statusText}

🆔 Order ID:
${orderId}`;


      await telegramRequest(
        "editMessageText",
        {
          chat_id: chatId,
          message_id: messageId,
          text: updatedText,
          reply_markup: getKeyboard(orderId)
        }
      );
    }


    return res.status(200).json({
      success: true,
      status: newStatus,
      orderId
    });


  } catch (error) {

    console.error(
      "TELEGRAM WEBHOOK ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Webhook error"
    });
  }
}


// =====================================
// TELEGRAM KEYBOARD
// =====================================

function getKeyboard(orderId) {

  return {
    inline_keyboard: [

      [
        {
          text: "🟡 UNDER VERIFICATION",
          callback_data:
            `status:${orderId}:pending`
        }
      ],

      [
        {
          text: "🟢 APPROVE",
          callback_data:
            `status:${orderId}:approved`
        },

        {
          text: "🔴 REJECT",
          callback_data:
            `status:${orderId}:rejected`
        }
      ],

      [
        {
          text: "📦 DELIVERED",
          callback_data:
            `status:${orderId}:delivered`
        }
      ]

    ]
  };
}


// =====================================
// ANSWER TELEGRAM BUTTON
// =====================================

async function answerCallback(
  callbackId,
  text
) {

  const BOT_TOKEN =
    process.env.BOT_TOKEN;

  if (!BOT_TOKEN) return;

  try {

    await telegramRequest(
      "answerCallbackQuery",
      {
        callback_query_id: callbackId,
        text,
        show_alert: false
      }
    );

  } catch (error) {

    console.error(
      "ANSWER CALLBACK ERROR:",
      error
    );
  }
}


// =====================================
// TELEGRAM API HELPER
// =====================================

async function telegramRequest(
  method,
  body
) {

  const BOT_TOKEN =
    process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    throw new Error(
      "BOT_TOKEN missing"
    );
  }


  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(body)
    }
  );


  const data =
    await response.json();


  if (!response.ok || !data.ok) {

    throw new Error(
      data?.description ||
      `Telegram ${method} failed`
    );
  }


  return data;
}