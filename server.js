import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔑 CONFIG
const PAGE_ACCESS_TOKEN = "PASTE_FACEBOOK_TOKEN_HERE";
const VERIFY_TOKEN = "123456";
const OPENAI_API_KEY = "PASTE_OPENAI_KEY_HERE";

// 🏪 DATA SHOP (SỬA THEO SHOP BẠN)
const shopData = `
Shop cho thuê váy:

- Giá: 100k – 500k/ngày
- Thuê 2 ngày: giảm 30%
- Đặt cọc: 50%
- Size: S, M, L
- Có giao hàng toàn quốc

Sản phẩm:
1. Váy body đỏ: sexy, đi tiệc
2. Váy maxi trắng: đi biển
3. Váy đen sang chảnh: dự tiệc tối
`;

// 🧠 AI
const systemPrompt = `
Bạn là nhân viên chăm sóc khách hàng cho shop cho thuê đồ.

${shopData}

Quy tắc:
- Thân thiện, tự nhiên
- Ngắn gọn
- Có emoji nhẹ
- Luôn gợi ý thêm
- Nếu thiếu info → hỏi lại

Mục tiêu: chốt đơn
`;

// VERIFY
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.send("Error");
  }
});

// RECEIVE MESSAGE
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
    console.log(err);
    res.sendStatus(500);
  }
});

// AI FUNCTION
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

// SEND MESSAGE
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
app.listen(3000, () => console.log("Running on port 3000"));
