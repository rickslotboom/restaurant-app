import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { message } = req.body;

  await fetch(`https://api.telegram.org/bot8721756148:AAGPOOo96w_ax4drKOnsphkAJ56vreyjpjI/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: "719417983",
      text: message,
    }),
  });

  res.status(200).json({ ok: true });
}