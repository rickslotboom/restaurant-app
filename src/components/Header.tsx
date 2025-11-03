import React from "react";
import styles from "./Header.module.css";

type Props = {
  view: "menu" | "summary" | "kitchen";
  setView: React.Dispatch<React.SetStateAction<"menu" | "summary" | "kitchen">>;
  orderCount: number;
};


export default function Header({ view, setView, orderCount }: Props) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Restaurant Bestel App</h1>
      <nav className={styles.nav}>
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
          className={view === "kitchen" ? styles.active : ""}
          onClick={() => setView("kitchen")}
        >
          Keuken ({orderCount})
        </button>
      </nav>
    </header>
  );
}
