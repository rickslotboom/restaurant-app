// api/sumup-checkout.js
//
// Deze route wordt aangeroepen vanuit PaymentModal wanneer de bediening op "Pin" klikt.
// Hij stuurt een betaalopdracht naar de SumUp Solo terminal via de Cloud API.
//
// Request body (POST):
// {
//   orderId: string,        // Firestore order ID
//   amount: number,         // bedrag in euro (bijv. 12.50)
//   description: string,    // omschrijving op de terminal (bijv. "Tafel 5")
// }
//
// Response:
// {
//   success: true,
//   clientTransactionId: string   // sla dit op in Firestore bij de order
// }

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

    // Bedrag naar centen omzetten (SumUp verwacht minor units)
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
          // client_transaction_id = orderId zodat webhook de juiste order kan vinden
          client_transaction_id: orderId,
          // Webhook URL zodat SumUp ons notificeert na betaling
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

    console.log(`[SumUp Checkout] ✅ Betaling aangemaakt, transactie ID: ${clientTransactionId}`);

    return res.status(200).json({
      success: true,
      clientTransactionId,
    });

  } catch (error) {
    console.error("[SumUp Checkout] Fout:", error.message);
    return res.status(500).json({ error: error.message });
  }
}