import React, { useState } from "react";
import { loginUser } from "../auth/loginUser";
import { useAuthContext } from "../hooks/useAuth";
import styles from "./Login.module.css";

export default function Login() {
  const { login } = useAuthContext(); // 🔹 Haal de login functie uit context
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await loginUser(username, password);

      if (!result.success || !result.user) {
        setError(result.error || "Onbekende fout");
        return;
      }

      // 🔹 Update context met de ingelogde user
      login(result.user.username, result.user.role);

      // Optioneel: clear fields
      setUsername("");
      setPassword("");
      setError("");

    } catch (err) {
      console.error("❌ Fout bij login:", err);
      setError("Er ging iets mis bij het inloggen");
    }
  };

  return (
    <div className={styles.container}>
      <h2>Inloggen</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Gebruikersnaam"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit">Inloggen</button>
      </form>
    </div>
  );
}
