import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// 🔐 LẤY BIẾN MÔI TRƯỜNG
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🏪 DATA SHOP
const shopData = `
Shop cho thuê váy:

- Giá: 100k – 500k/ngày
- Thuê 2 ngày: giảm 30%
- Đặt cọc: 50%
- Size: S, M, L
- Có giao hàng toàn quốc
`;

// 🧠 AI PROMPT
const systemPrompt = `
Bạn là nhân viên chăm sóc khách hàng.

${shopData}

- Trả lời thân thiện
- Ngắn gọn
- Gợi ý thêm sản phẩm
- Mục tiêu: chốt đơn
`;

// VERIFY
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.send("Error verify token");
  }
});

// RECEIVE
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const msg = entry?.messaging?.[0];

    if (!msg || !msg.message) return res.sendStatus(200);

    const sender = msg.sender.id;
    const text = msg.message.text;

    const reply = await askAI(text);

    await sendMessage(sender, reply);

    res.sendStatus(200);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.sendStatus(500);
  }
});

// AI
async function askAI(message) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      }
    }
  );

  return res.data.choices[0].message.content;
}

// SEND
async function sendMessage(sender, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: sender },
      message: { text }
    }
  );
}

// RUN
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running..."));
