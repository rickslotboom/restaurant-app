// src/auth/loginUser.ts
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import bcrypt from "bcryptjs";

export async function loginUser(username: string, password: string) {
  try {
    console.log("[loginUser] trying login for username:", username);

    // query by username
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn("[loginUser] no user doc found for", username);
      return { success: false, error: "Gebruiker bestaat niet." };
    }

    // take first matching doc
    const userDoc = snapshot.docs[0];
    const data = userDoc.data();
    console.log("[loginUser] firestore doc data:", data);

    // try multiple common field names
    const rawHash =
      (data.hashedPassword as string) ??
      (data.passwordHash as string) ??
      (data.password as string) ??
      "";

    if (!rawHash) {
      console.warn("[loginUser] geen password hash veld gevonden in doc");
      return { success: false, error: "Onjuist gebruikersrecord (geen wachtwoordhash)" };
    }

    const storedHash = rawHash.trim();
    console.log("[loginUser] storedHash (start):", storedHash.slice(0, 10), "...", "length:", storedHash.length);

    // quick sanity check: bcrypt hashes start with $2
    if (!storedHash.startsWith("$2")) {
      console.warn("[loginUser] stored hash does not look like a bcrypt hash");
      // still attempt compare, but warn
    }

    // compare
    const match = await bcrypt.compare(password, storedHash);
    console.log("[loginUser] bcrypt.compare result:", match);

    if (!match) {
      return { success: false, error: "Wachtwoord onjuist." };
    }

    return {
      success: true,
      user: {
        username: data.username ?? username,
        role: data.role ?? "bediening",
      },
    };
  } catch (err) {
    console.error("[loginUser] error:", err);
    return { success: false, error: "Er ging iets fout bij inloggen." };
  }
}
