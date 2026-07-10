// api/sumup-webhook.js
//
// Deze route wordt aangeroepen door SumUp zodra een betaling geslaagd of mislukt is.
// SumUp stuurt een HTTP POST met de betaalstatus naar:
// https://restaurant.speciaalzaakvoorburg.nl/api/sumup-webhook
//
// Zet dit bestand in de /api map van je restaurant-app project, naast notify.js.

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Voorkom dubbele Firebase initialisatie in Vercel serverless omgeving
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default async function handler(req, res) {
  // SumUp stuurt altijd een POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    console.log("[SumUp Webhook] Ontvangen:", JSON.stringify(body));

    // Status en transaction ID zitten in body.payload
    const { status, client_transaction_id } = body.payload;

    if (status !== "successful") {
      console.log(`[SumUp Webhook] Status is '${status}', geen actie vereist.`);
      return res.status(200).json({ received: true });
    }

    // Zoek de order in Firestore op basis van client_transaction_id
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("sumupTransactionId", "==", client_transaction_id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn(`[SumUp Webhook] Geen order gevonden voor transactie ${client_transaction_id}`);
      return res.status(200).json({ received: true });
    }

    // Order op "Betaald" zetten
    const orderDoc = snapshot.docs[0];
    await updateDoc(doc(db, "orders", orderDoc.id), {
      status: "Betaald",
      sumupCheckoutId: body.id,
    });

    console.log(`[SumUp Webhook] Order ${orderDoc.id} op Betaald gezet.`);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("[SumUp Webhook] Fout:", error.message);
    // Altijd 200 terugsturen — anders blijft SumUp hetzelfde webhook-verzoek herhalen
    return res.status(200).json({ received: true });
  }
}