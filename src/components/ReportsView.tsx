import React, { useMemo } from "react";
import { Order } from "../types";

type Props = {
  orders: Order[];
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

export default function ReportsView({ orders }: Props) {
  const today = new Date();
  const fromTs = startOfDay(today);
  const toTs = endOfDay(today);

  const stats = useMemo(() => {
    // Alleen betaalde orders, gefilterd op het moment van BETALEN (paidAt),
    // niet op het moment van aanmaken (timestamp) — met een fallback naar
    // timestamp voor orders die zijn afgerekend vóórdat paidAt bestond.
    const paidToday = orders.filter((o) => {
      if (o.status !== "Betaald") return false;
      const relevantTs = o.paidAt ?? o.timestamp;
      if (relevantTs === undefined) return false;
      return relevantTs >= fromTs && relevantTs <= toTs;
    });

    let grossRevenue = 0;
    let cashTotal = 0;
    let pinTotal = 0;
    let tipTotal = 0;
    let vatTotal = 0;
    let vat9Total = 0;
    let vat21Total = 0;

    paidToday.forEach((o) => {
      // paidTotal is het bedrag na korting, exclusief fooi — dat is precies
      // de brutoomzet die je wil optellen. Voor oudere orders (van vóór
      // Dag 2) die dit veld nog niet hebben, val terug op de itemsom.
      const itemsSubtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
      const orderPaidTotal = o.paidTotal ?? itemsSubtotal;

      grossRevenue += orderPaidTotal;

      if (o.paymentMethod === "cash") cashTotal += orderPaidTotal;
      if (o.paymentMethod === "pin") pinTotal += orderPaidTotal;

      tipTotal += o.tip ?? 0;

      // BTW herberekenen op basis van de daadwerkelijk betaalde bedragen
      // (dus na korting), verdeeld over de items naar rato van hun aandeel
      // in de oorspronkelijke subtotaal.
      if (itemsSubtotal > 0) {
        const discountRatio = orderPaidTotal / itemsSubtotal;
        o.items.forEach((item) => {
          const itemGross = item.price * item.qty * discountRatio;
          const rate = item.vatRate ?? 9;
          const itemVat = itemGross - itemGross / (1 + rate / 100);
          vatTotal += itemVat;
          if (rate === 9) vat9Total += itemVat;
          else vat21Total += itemVat;
        });
      }
    });

    return {
      orderCount: paidToday.length,
      grossRevenue,
      cashTotal,
      pinTotal,
      tipTotal,
      vatTotal,
      vat9Total,
      vat21Total,
    };
  }, [orders, fromTs, toTs]);

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "1.25rem",
    flex: "1 1 200px",
    minWidth: "200px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    color: "#888",
    marginBottom: "0.4rem",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "1.6rem",
    fontWeight: "bold",
    color: "#2c3e50",
  };

  const dateLabel = today.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>Rapporten</h2>
      <p style={{ color: "#888", marginTop: 0, marginBottom: "1.5rem" }}>
        Vandaag — {dateLabel} · {stats.orderCount} betaalde bon{stats.orderCount === 1 ? "" : "nen"}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ ...cardStyle, background: "#2c3e50", color: "white" }}>
          <div style={{ ...labelStyle, color: "#cdd6df" }}>Totale brutoomzet</div>
          <div style={{ ...valueStyle, color: "white" }}>€{stats.grossRevenue.toFixed(2)}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>💵 Cash</div>
          <div style={valueStyle}>€{stats.cashTotal.toFixed(2)}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>💳 Pin</div>
          <div style={valueStyle}>€{stats.pinTotal.toFixed(2)}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>🙌 Fooi</div>
          <div style={valueStyle}>€{stats.tipTotal.toFixed(2)}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>🧾 BTW totaal</div>
          <div style={valueStyle}>€{stats.vatTotal.toFixed(2)}</div>
          <div style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "0.3rem" }}>
            9%: €{stats.vat9Total.toFixed(2)} · 21%: €{stats.vat21Total.toFixed(2)}
          </div>
        </div>
      </div>

      {stats.orderCount === 0 && (
        <p style={{ color: "#888" }}>Nog geen betaalde bonnen vandaag.</p>
      )}
    </div>
  );
}
