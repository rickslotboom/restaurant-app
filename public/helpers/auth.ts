import { db } from "../../src/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import bcrypt from "bcryptjs";

export async function loginUser(username: string, password: string) {
  const q = query(collection(db, "users"), where("username", "==", username));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, error: "Gebruiker bestaat niet" };
  }

  const userDoc = snapshot.docs[0];
  const data = userDoc.data();

  const isMatch = await bcrypt.compare(password, data.hashedPassword);

  if (!isMatch) {
    return { success: false, error: "Wachtwoord onjuist" };
  }

  return {
    success: true,
    user: {
      username: data.username,
      role: data.role,
    },
  };
}
