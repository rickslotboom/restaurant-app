// src/auth/loginUser.ts
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const USERNAME_DOMAIN = "@voorburg.local";
const MAX_ATTEMPTS = 3;

export async function loginUser(username: string, password: string) {
  const auth = getAuth();
  const email = `${username}${USERNAME_DOMAIN}`;
  const attemptsRef = doc(db, "loginAttempts", username);

  // Check eerst of dit account geblokkeerd is, voordat we een poging wagen
  const attemptsSnap = await getDoc(attemptsRef);
  if (attemptsSnap.exists() && attemptsSnap.data().locked === true) {
    return {
      success: false,
      error: "Account geblokkeerd na te veel mislukte pogingen. Neem contact op met de beheerder.",
    };
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // Geslaagd: teller resetten
    await setDoc(attemptsRef, { failedCount: 0, locked: false }, { merge: true });

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
    // Mislukt: teller ophogen, en bij bereiken van de limiet blokkeren
    const currentCount = attemptsSnap.exists() ? (attemptsSnap.data().failedCount || 0) : 0;
    const newCount = currentCount + 1;
    const shouldLock = newCount >= MAX_ATTEMPTS;

    await setDoc(
      attemptsRef,
      { failedCount: newCount, locked: shouldLock },
      { merge: true }
    );

    if (shouldLock) {
      return {
        success: false,
        error: "Account geblokkeerd na te veel mislukte pogingen. Neem contact op met de beheerder.",
      };
    }

    // Generieke foutmelding, ongeacht of gebruikersnaam niet bestaat of
    // wachtwoord fout is — voorkomt dat een aanvaller kan afleiden welke
    // gebruikersnamen wél bestaan.
    return { success: false, error: "Ongeldige gebruikersnaam of wachtwoord." };
  }
}
