import React from "react";
import styles from "./Header.module.css";

type Props = {
  view: "floorplan" | "menu" | "kitchen" | "billing" | "bar" | "beheer";
  setView: React.Dispatch<React.SetStateAction<"floorplan" | "menu" | "kitchen" | "billing" | "bar" | "beheer">>;
  orderCount: number;
  user: { username: string; role: string };
  onLogout: () => void;
};

export default function Header({ view, setView, orderCount, user, onLogout }: Props) {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {user.role === "bediening" && (
          <>
            <button
              className={view === "floorplan" ? styles.active : ""}
              onClick={() => setView("floorplan")}
            >
              Vloerplan
            </button>
            <button
              className={view === "menu" ? styles.active : ""}
              onClick={() => setView("menu")}
            >
              Menu
            </button>
            <button
              className={view === "billing" ? styles.active : ""}
              onClick={() => setView("billing")}
            >
              Rekeningen
            </button>
          </>
        )}

        {user.role === "keuken" && (
          <>
            <button
              className={view === "kitchen" ? styles.active : ""}
              onClick={() => setView("kitchen")}
            >
              Keuken ({orderCount})
            </button>
            <button
              className={view === "bar" ? styles.active : ""}
              onClick={() => setView("bar")}
            >
              Bar
            </button>
          </>
        )}

        {user.role === "manager" && (
          <>
            <button
              className={view === "floorplan" ? styles.active : ""}
              onClick={() => setView("floorplan")}
            >
              Vloerplan
            </button>
            <button
              className={view === "menu" ? styles.active : ""}
              onClick={() => setView("menu")}
            >
              Menu
            </button>
            <button
              className={view === "billing" ? styles.active : ""}
              onClick={() => setView("billing")}
            >
              Rekeningen
            </button>
            <button
              className={view === "kitchen" ? styles.active : ""}
              onClick={() => setView("kitchen")}
            >
              Keuken ({orderCount})
            </button>
            <button
              className={view === "bar" ? styles.active : ""}
              onClick={() => setView("bar")}
            >
              Bar
            </button>
            <button
              className={view === "beheer" ? styles.active : ""}
              onClick={() => setView("beheer")}
            >
              ⚙️ Beheer
            </button>
          </>
        )}
      </nav>

      <div className={styles.userSection}>
        <span className={styles.username}>{user.username}</span>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Uitloggen
        </button>
      </div>
    </header>
  );
}