// api/sumup-cancel.js
//
// Annuleert een actieve checkout op de SumUp terminal.
// Wordt aangeroepen vanuit PaymentModal als de bediening op "Annuleren" klikt.
//
// Request body (POST):
// {
//   orderId: string,  // wordt gebruikt als client_transaction_id / reader identificatie
// }

const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
const SUMUP_AFFILIATE_KEY = process.env.SUMUP_AFFILIATE_KEY;
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
const SUMUP_READER_ID = process.env.SUMUP_READER_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log(`[SumUp Cancel] Annuleren checkout op reader ${SUMUP_READER_ID}`);

    const response = await fetch(
      `https://api.sumup.com/v0.1/merchants/${SUMUP_MERCHANT_CODE}/readers/${SUMUP_READER_ID}/checkout`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${SUMUP_API_KEY}`,
          "Affiliate-Key": SUMUP_AFFILIATE_KEY,
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("[SumUp Cancel] Fout:", JSON.stringify(data));
      return res.status(500).json({ error: "Annuleren mislukt", details: data });
    }

    console.log("[SumUp Cancel] ✅ Checkout geannuleerd op terminal");
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("[SumUp Cancel] Fout:", error.message);
    return res.status(500).json({ error: error.message });
  }
}