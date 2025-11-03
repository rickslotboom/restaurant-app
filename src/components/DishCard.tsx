import React from "react";
import { Dish } from "../types";
import styles from "./DishCard.module.css";

type Props = {
  dish: Dish;
  qty: number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function DishCard({ dish, qty, onAdd, onRemove }: Props) {
  const handleClick = () => {
    onAdd(dish.id);
  };

  return (
    <div
      className={styles.card}
      role="group"
      aria-label={dish.name}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <div className={styles.imgWrap}>
        <img
          src={dish.image}
          alt={dish.name}
          className={styles.img}
          draggable={false}
        />
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{dish.name}</div>
        <div className={styles.price}>€{dish.price.toFixed(2)}</div>
      </div>

      <div
        className={styles.controls}
        onClick={(e) => e.stopPropagation()} // voorkomt dat knoppen dubbel tellen
      >
        <button
          onClick={() => onRemove(dish.id)}
          aria-label={`Verwijder ${dish.name}`}
        >
          −
        </button>
        <div className={styles.qty}>{qty}</div>
        <button
          onClick={() => onAdd(dish.id)}
          aria-label={`Voeg ${dish.name} toe`}
        >
          +
        </button>
      </div>
    </div>
  );
}
