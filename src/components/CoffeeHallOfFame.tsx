import React, { useMemo } from "react";
import { Order } from "../types";

const KOFFIE_CATEGORIE = "Koffie";
const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
const TITLES = ["Koffiekampioen", "Espresso Elite", "Cappuccino Koning", "Latte Legende", "Barista Beginner"];

type Props = { orders: Order[]; menu: { id: string; name: string; category: string }[] };

export default function CoffeeHallOfFame({ orders, menu }: Props) {
  const coffeeIds = useMemo(
    () => new Set(menu.filter((d) => d.category === KOFFIE_CATEGORIE).map((d) => d.id)),
    [menu]
  );

  const coffeeNames = useMemo(
    () => new Set(menu.filter((d) => d.category === KOFFIE_CATEGORIE).map((d) => d.name)),
    [menu]
  );

  const topDays = useMemo(() => {
    const byDay: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status !== "Betaald") return;
      const day = new Date(o.timestamp ?? 0).toLocaleDateString("nl-NL", {
        day: "2-digit", month: "long", year: "numeric",
      });
      o.items.forEach((item) => {
        const baseId = item.dishId?.split("|")[0];
        if (coffeeIds.has(baseId) || coffeeNames.has(item.name)) {
          byDay[day] = (byDay[day] || 0) + item.qty;
        }
      });
    });
    return Object.entries(byDay)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [orders, coffeeIds, coffeeNames]);

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "3rem" }}>☕</div>
        <h1 style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.8rem" }}>Koffie Hall of Fame</h1>
        <p style={{ color: "#666", margin: 0 }}>De meest caffeïne-rijke dagen ooit</p>
      </div>
      {topDays.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999" }}>Nog geen koffiedata beschikbaar.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {topDays.map(([day, qty], i) => (
            <div key={day} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              background: i === 0 ? "#fff8e1" : "#fafafa",
              border: `2px solid ${i === 0 ? "#f9a825" : "#e0e0e0"}`,
              borderRadius: 12, padding: "1rem 1.25rem",
              boxShadow: i === 0 ? "0 2px 12px rgba(249,168,37,0.2)" : "none",
            }}>
              <span style={{ fontSize: "2rem", minWidth: 40, textAlign: "center" }}>{MEDALS[i]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "1rem" }}>{day}</div>
                <div style={{ fontSize: "0.8rem", color: "#888" }}>{TITLES[i]}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.4rem", color: "#5d4037" }}>{qty}</div>
                <div style={{ fontSize: "0.75rem", color: "#999" }}>kopjes</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}