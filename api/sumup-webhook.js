// api/sumup-webhook.js
//
// Deze route wordt aangeroepen door SumUp zodra een betaling geslaagd of mislukt is.
// Gebruikt Firebase Admin SDK om Firestore te updaten zonder authenticatie-beperkingen.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin initialisatie via service account uit environment variable
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Body kan als string binnenkomen in sommige Vercel configuraties
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("[SumUp Webhook] Ontvangen:", JSON.stringify(body));
    console.log("[SumUp Webhook] Payload:", JSON.stringify(body.payload));

    const { status, client_transaction_id } = body.payload ?? {};

    if (!status) {
      console.warn("[SumUp Webhook] Geen status gevonden in payload.");
      return res.status(200).json({ received: true });
    }

    if (status !== "successful") {
      console.log(`[SumUp Webhook] Status is '${status}', geen actie vereist.`);
      return res.status(200).json({ received: true });
    }

    // Zoek de order in Firestore op basis van client_transaction_id
    const snapshot = await db
      .collection("orders")
      .where("sumupTransactionId", "==", client_transaction_id)
      .get();

    if (snapshot.empty) {
      console.warn(`[SumUp Webhook] Geen order gevonden voor transactie ${client_transaction_id}`);
      return res.status(200).json({ received: true });
    }

    // Order op "Betaald" zetten
    const orderDoc = snapshot.docs[0];
    await db.collection("orders").doc(orderDoc.id).update({
      status: "Betaald",
      sumupCheckoutId: body.id,
    });

    console.log(`[SumUp Webhook] Order ${orderDoc.id} op Betaald gezet.`);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("[SumUp Webhook] Fout:", error.message);
    return res.status(200).json({ received: true });
  }
}