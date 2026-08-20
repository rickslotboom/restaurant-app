import React, { useState, useMemo } from "react";
import { Order } from "../types";

type Props = {
  orders: Order[];
};

type RangeMode = "today" | "day" | "week" | "month";

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

const formatDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatMonthInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export default function ReportsView({ orders }: Props) {
  const today = new Date();

  const [mode, setMode] = useState<RangeMode>("today");
  const [selectedDay, setSelectedDay] = useState<string>(formatDateInput(today));
  const [selectedWeek, setSelectedWeek] = useState<string>(formatDateInput(today));
  const [selectedMonth, setSelectedMonth] = useState<string>(formatMonthInput(today));

  const { fromTs, toTs, rangeLabel } = useMemo(() => {
    if (mode === "today") {
      return { fromTs: startOfDay(today), toTs: endOfDay(today), rangeLabel: today.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) };
    }
    if (mode === "day") {
      const d = new Date(selectedDay);
      return { fromTs: startOfDay(d), toTs: endOfDay(d), rangeLabel: d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) };
    }
    if (mode === "week") {
      const d = new Date(selectedWeek);
      const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const mon = new Date(d);
      mon.setDate(d.getDate() - day);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const label = `${mon.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} — ${sun.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
      return { fromTs: startOfDay(mon), toTs: endOfDay(sun), rangeLabel: `Week van ${label}` };
    }
    // mode === "month"
    const [yStr, mStr] = selectedMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const label = first.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    return { fromTs: startOfDay(first), toTs: endOfDay(last), rangeLabel: label.charAt(0).toUpperCase() + label.slice(1) };
  }, [mode, selectedDay, selectedWeek, selectedMonth, today]);

  const stats = useMemo(() => {
    const paidInRange = orders.filter((o) => {
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

    paidInRange.forEach((o) => {
      const itemsSubtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
      const orderPaidTotal = o.paidTotal ?? itemsSubtotal;

      grossRevenue += orderPaidTotal;

      if (o.paymentMethod === "cash") cashTotal += orderPaidTotal;
      if (o.paymentMethod === "pin") pinTotal += orderPaidTotal;

      tipTotal += o.tip ?? 0;

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
      orderCount: paidInRange.length,
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

  const isFuture = fromTs > endOfDay(today);

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: "0.4rem 0.9rem", borderRadius: "20px", border: "none", cursor: "pointer",
    background: active ? "#2196F3" : "#ddd",
    color: active ? "white" : "#333",
    fontWeight: active ? "bold" : "normal",
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>Rapporten</h2>

      {/* Schakelaar: Vandaag / Per dag / Per week / Per maand */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center",
        marginBottom: "1rem",
      }}>
        <button onClick={() => setMode("today")} style={toggleBtn(mode === "today")}>Vandaag</button>
        <button onClick={() => setMode("day")} style={toggleBtn(mode === "day")}>Per dag</button>
        <button onClick={() => setMode("week")} style={toggleBtn(mode === "week")}>Per week</button>
        <button onClick={() => setMode("month")} style={toggleBtn(mode === "month")}>Per maand</button>

        {mode === "day" && (
          <input
            type="date"
            value={selectedDay}
            max={formatDateInput(today)}
            onChange={(e) => setSelectedDay(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        )}
        {mode === "week" && (
          <input
            type="date"
            value={selectedWeek}
            max={formatDateInput(today)}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        )}
        {mode === "month" && (
          <input
            type="month"
            value={selectedMonth}
            max={formatMonthInput(today)}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        )}
      </div>

      <p style={{ color: "#888", marginTop: 0, marginBottom: "1.5rem" }}>
        {rangeLabel} · {stats.orderCount} betaalde bon{stats.orderCount === 1 ? "" : "nen"}
      </p>

      {isFuture ? (
        <p style={{ color: "#888" }}>Deze periode ligt in de toekomst.</p>
      ) : (
        <>
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
            <p style={{ color: "#888" }}>Geen betaalde bonnen in deze periode.</p>
          )}
        </>
      )}
    </div>
  );
}
