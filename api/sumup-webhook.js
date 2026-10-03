
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("[SumUp Webhook] Ontvangen:", JSON.stringify(body));
    console.log("[SumUp Webhook] Payload:", JSON.stringify(body.payload));

    const { status, client_transaction_id } = body.payload ?? {};

    if (!status) {
      console.warn("[SumUp Webhook] Geen status gevonden in payload.");
      return res.status(200).json({ received: true });
    }

    // Zoek eerst op sumupTransactionId
    let orderRef = null;
    const snapshot = await db
      .collection("orders")
      .where("sumupTransactionId", "==", client_transaction_id)
      .get();

    if (!snapshot.empty) {
      orderRef = db.collection("orders").doc(snapshot.docs[0].id);
      console.log(`[SumUp Webhook] Order gevonden via sumupTransactionId: ${snapshot.docs[0].id}`);
    } else {
      // Fallback: client_transaction_id is de Firestore document ID (orderId)
      const directDoc = await db.collection("orders").doc(client_transaction_id).get();
      if (directDoc.exists) {
        orderRef = db.collection("orders").doc(client_transaction_id);
        console.log(`[SumUp Webhook] Order gevonden via document ID fallback: ${client_transaction_id}`);
      } else {
        console.warn(`[SumUp Webhook] Geen order gevonden voor transactie ${client_transaction_id}`);
        return res.status(200).json({ received: true });
      }
    }

    if (status === "successful") {
      await orderRef.update({
        status: "Betaald",
        paymentMethod: "pin",
        paidAt: Date.now(),
        sumupCheckoutId: body.id,
        sumupStatus: "successful",
      });
      console.log(`[SumUp Webhook] Order ${orderRef.id} op Betaald gezet.`);

    } else if (status === "failed" || status === "cancelled") {
      await orderRef.update({
        sumupStatus: status,
      });
      console.log(`[SumUp Webhook] Betaling mislukt (${status}) voor order ${orderRef.id}.`);

    } else {
      console.log(`[SumUp Webhook] Status is '${status}', geen actie vereist.`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("[SumUp Webhook] Fout:", error.message);
    return res.status(200).json({ received: true });
  }
}
