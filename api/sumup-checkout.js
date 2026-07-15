// api/sumup-checkout.js

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
const SUMUP_AFFILIATE_KEY = process.env.SUMUP_AFFILIATE_KEY;
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
const SUMUP_READER_ID = process.env.SUMUP_READER_ID;
const WEBHOOK_URL = process.env.SUMUP_WEBHOOK_URL;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId, amount, description } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: "orderId en amount zijn verplicht" });
    }

    const amountInCents = Math.round(amount * 100);

    console.log(`[SumUp Checkout] Betaling aanmaken: €${amount} voor order ${orderId}`);

    const response = await fetch(
      `https://api.sumup.com/v0.1/merchants/${SUMUP_MERCHANT_CODE}/readers/${SUMUP_READER_ID}/checkout`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUMUP_API_KEY}`,
          "Content-Type": "application/json",
          "Affiliate-Key": SUMUP_AFFILIATE_KEY,
        },
        body: JSON.stringify({
          total_amount: {
            currency: "EUR",
            minor_unit: 2,
            value: amountInCents,
          },
          description,
          client_transaction_id: orderId,
          return_url: WEBHOOK_URL,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[SumUp Checkout] Fout:", JSON.stringify(data));
      return res.status(500).json({ error: "Betaling aanmaken mislukt", details: data });
    }

    const clientTransactionId = data?.data?.client_transaction_id || orderId;

    // ── Sla sumupTransactionId op in Firestore zodat de webhook de order kan vinden ──
    await db.collection("orders").doc(orderId).update({
      sumupTransactionId: clientTransactionId,
    });

    console.log(`[SumUp Checkout] ✅ Betaling aangemaakt en opgeslagen, transactie ID: ${clientTransactionId}`);

    return res.status(200).json({
      success: true,
      clientTransactionId,
    });

  } catch (error) {
    console.error("[SumUp Checkout] Fout:", error.message);
    return res.status(500).json({ error: error.message });
  }
}