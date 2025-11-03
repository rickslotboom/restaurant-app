import React from "react";
import { Dish } from "../types";

type Props = {
  menu: Dish[];
  selected: Record<string, number>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function Menu({ menu, selected, onAdd, onRemove }: Props) {
  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ textAlign: "center" }}>Kies een gerecht:</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        {menu.map((dish) => (
          <div
            key={dish.id}
            onClick={() => onAdd(dish.id)} // klik op kaart = toevoegen
            style={{
              border: "2px solid #ccc",
              borderRadius: "12px",
              padding: "1rem",
              width: "180px",
              textAlign: "center",
              backgroundColor: "#fff",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.03)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }
          >
            <img
              src={dish.image}
              alt={dish.name}
              style={{
                width: "100%",
                borderRadius: "8px",
                userSelect: "none",
                pointerEvents: "none", // laat clicks door naar container
              }}
            />
            <h3 style={{ margin: "0.5rem 0 0 0" }}>{dish.name}</h3>
            <p style={{ margin: "0.25rem 0", fontWeight: "bold" }}>
              €{dish.price.toFixed(2)}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
              onClick={(e) => e.stopPropagation()} // voorkomt dubbel tellen
            >
              <button onClick={() => onRemove(dish.id)}>-</button>
              <span>{selected[dish.id] || 0}</span>
              <button onClick={() => onAdd(dish.id)}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
