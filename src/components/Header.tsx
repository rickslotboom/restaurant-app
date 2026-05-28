import React from "react";
import styles from "./Header.module.css";

type Props = {
  view: "menu" | "summary" | "kitchen" | "billing";
setView: React.Dispatch<React.SetStateAction<"menu" | "summary" | "kitchen" | "billing">>;
  orderCount: number;

  // Nieuw toegevoegd
  user: { username: string; role: string };
  onLogout: () => void;
};

export default function Header({ view, setView, orderCount, user, onLogout }: Props) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Restaurant Bestel App</h1>

      <nav className={styles.nav}>
        {user.role === "bediening" && (
          <>
            <button
              className={view === "menu" ? styles.active : ""}
              onClick={() => setView("menu")}
            >
              Menu
            </button>

            <button
              className={view === "summary" ? styles.active : ""}
              onClick={() => setView("summary")}
            >
              Winkelwagen
            </button>

            <button
  className={view === "billing" ? styles.active : ""}
  onClick={() => setView("billing")}
>
  Rekeningen
</button>
          </>
        )}

        {user.role === "kok" && (
          <button
            className={view === "kitchen" ? styles.active : ""}
            onClick={() => setView("kitchen")}
          >
            Keuken ({orderCount})
          </button>
        )}
      </nav>

      {/* Rechterkant: ingelogde gebruiker + logout */}
      <div className={styles.userSection}>
        <span>
          Ingelogd als: <strong>{user.username}</strong> ({user.role})
        </span>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Uitloggen
        </button>
      </div>
    </header>
  );
}
