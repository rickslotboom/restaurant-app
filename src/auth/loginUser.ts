// src/auth/loginUser.ts
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const USERNAME_DOMAIN = "@voorburg.local";

export async function loginUser(username: string, password: string) {
  const auth = getAuth();
  const email = `${username}${USERNAME_DOMAIN}`;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // Rol ophalen uit de bestaande users-collectie (geen custom claims nodig)
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    const role = snapshot.empty ? "bediening" : snapshot.docs[0].data().role;

    return {
      success: true,
      user: {
        username,
        role,
      },
    };
  } catch (err) {
    // Generieke foutmelding, ongeacht of gebruikersnaam niet bestaat of
    // wachtwoord fout is — voorkomt dat een aanvaller kan afleiden welke
    // gebruikersnamen wél bestaan.
    return { success: false, error: "Ongeldige gebruikersnaam of wachtwoord." };
  }
}