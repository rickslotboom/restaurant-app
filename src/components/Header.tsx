import React from "react";
import styles from "./Header.module.css";

type Props = {
  view: "floorplan" | "menu" | "kitchen" | "billing" | "bar";
  setView: React.Dispatch<React.SetStateAction<"floorplan" | "menu" | "kitchen" | "billing" | "bar">>;
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
      </nav>

      <div className={styles.userSection}>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Uitloggen
        </button>
      </div>
    </header>
  );
}