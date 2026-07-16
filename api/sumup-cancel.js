// api/sumup-cancel.js

const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
const SUMUP_AFFILIATE_KEY = process.env.SUMUP_AFFILIATE_KEY;
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
const SUMUP_READER_ID = process.env.SUMUP_READER_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log(`[SumUp Cancel] Terminate checkout op reader ${SUMUP_READER_ID}`);

    const response = await fetch(
      `https://api.sumup.com/v0.1/merchants/${SUMUP_MERCHANT_CODE}/readers/${SUMUP_READER_ID}/terminate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUMUP_API_KEY}`,
          "Affiliate-Key": SUMUP_AFFILIATE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // 204 No Content = succesvol, geen body
    if (response.status === 204 || response.ok) {
      console.log("[SumUp Cancel] ✅ Checkout getermineerd op terminal");
      return res.status(200).json({ success: true });
    }

    const data = await response.json().catch(() => ({}));
    console.error("[SumUp Cancel] Fout:", JSON.stringify(data));
    return res.status(500).json({ error: "Annuleren mislukt", details: data });

  } catch (error) {
    console.error("[SumUp Cancel] Fout:", error.message);
    return res.status(500).json({ error: error.message });
  }
}