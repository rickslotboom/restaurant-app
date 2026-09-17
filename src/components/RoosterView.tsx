import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ── Hulpfuncties ──
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
  return monday;
}

function getDaysOfWeek(year: number, week: number): Date[] {
  const monday = getMondayOfWeek(year, week);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeeksInMonth(year: number, month: number): number[] {
  const seenWeeks = new Set<number>();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    seenWeeks.add(getWeekNumber(new Date(d)));
  }
  return Array.from(seenWeeks);
}

function getMaxWeek(year: number): number {
  const dec28 = new Date(year, 11, 28);
  return getWeekNumber(dec28);
}

function navigeerWeek(jaar: number, week: number, delta: number): { jaar: number; week: number } {
  const maxWeek = getMaxWeek(jaar);
  let nieuweWeek = week + delta;
  let nieuwJaar = jaar;

  if (nieuweWeek < 1) {
    nieuwJaar = jaar - 1;
    nieuweWeek = getMaxWeek(nieuwJaar);
  } else if (nieuweWeek > maxWeek) {
    nieuwJaar = jaar + 1;
    nieuweWeek = 1;
  }

  return { jaar: nieuwJaar, week: nieuweWeek };
}

const MAANDEN = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const DAGEN_KORT = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

type WeekEntry = {
  naam: string;
  van: string;
  tot: string;
};

type DagRooster = WeekEntry[];

export default function RoosterView() {
  const today = new Date();
  const [jaar, setJaar] = useState(today.getFullYear());
  const [geselecteerdeWeek, setGeselecteerdeWeek] = useState<number | null>(getWeekNumber(today));
  const [geselecteerdeDag, setGeselecteerdeDag] = useState<number | null>(null);
  const [dagRoosters, setDagRoosters] = useState<Record<string, DagRooster>>({});
  const [nieuwNaam, setNieuwNaam] = useState("");
  const [nieuwVan, setNieuwVan] = useState("");
  const [nieuwTot, setNieuwTot] = useState("");
  const [laden, setLaden] = useState(false);
  const [toonKalender, setToonKalender] = useState(false);

  const todayWeek = getWeekNumber(today);

  // ── Laad weekdata uit Firestore ──
  useEffect(() => {
    if (geselecteerdeWeek === null) return;
    setLaden(true);
    const weekKey = `${jaar}-W${geselecteerdeWeek}`;
    getDoc(doc(db, "rooster", weekKey)).then((snapshot) => {
      setDagRoosters(snapshot.exists() ? snapshot.data() as Record<string, DagRooster> : {});
      setLaden(false);
    }).catch(() => setLaden(false));
  }, [geselecteerdeWeek, jaar]);

  // ── Sla dagdata op in Firestore ──
  const slaOp = async (dagKey: string, entries: DagRooster) => {
    if (geselecteerdeWeek === null) return;
    const weekKey = `${jaar}-W${geselecteerdeWeek}`;
    const updated = { ...dagRoosters, [dagKey]: entries };
    setDagRoosters(updated);
    await setDoc(doc(db, "rooster", weekKey), updated, { merge: true });
  };

  const voegToe = async (dagIndex: number) => {
    if (!nieuwNaam || !nieuwVan || !nieuwTot) return;
    const dagKey = `dag${dagIndex}`;
    const entries = [...(dagRoosters[dagKey] ?? []), { naam: nieuwNaam, van: nieuwVan, tot: nieuwTot }];
    await slaOp(dagKey, entries);
    setNieuwNaam("");
    setNieuwVan("");
    setNieuwTot("");
  };

  const verwijder = async (dagIndex: number, entryIndex: number) => {
    const dagKey = `dag${dagIndex}`;
    const entries = [...(dagRoosters[dagKey] ?? [])];
    entries.splice(entryIndex, 1);
    await slaOp(dagKey, entries);
  };

  const gaNaarWeek = (delta: number) => {
    if (geselecteerdeWeek === null) return;
    const { jaar: nieuwJaar, week: nieuweWeek } = navigeerWeek(jaar, geselecteerdeWeek, delta);
    setJaar(nieuwJaar);
    setGeselecteerdeWeek(nieuweWeek);
    setGeselecteerdeDag(null);
  };

  const weekDagen = geselecteerdeWeek !== null ? getDaysOfWeek(jaar, geselecteerdeWeek) : [];

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>

      {/* ── Weeknavigatie (altijd zichtbaar als week geselecteerd) ── */}
      {geselecteerdeWeek !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <button onClick={() => gaNaarWeek(-1)} style={navBtn}>◀</button>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
            Week {geselecteerdeWeek} — {jaar}
          </h2>
          <button onClick={() => gaNaarWeek(1)} style={navBtn}>▶</button>
          <button
            onClick={() => setToonKalender(!toonKalender)}
            style={{ ...navBtn, marginLeft: "auto", background: toonKalender ? "#2196F3" : "#eee", color: toonKalender ? "white" : "#333" }}
          >
            📅 Kalender
          </button>
          {laden && <span style={{ color: "#aaa", fontSize: "0.85rem" }}>Laden...</span>}
        </div>
      )}

      {/* ── Jaarkalender (uitklapbaar) ── */}
      {(geselecteerdeWeek === null || toonKalender) && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <button onClick={() => setJaar(j => j - 1)} style={navBtn}>◀ {jaar - 1}</button>
            <h3 style={{ margin: 0 }}>📅 {jaar}</h3>
            <button onClick={() => setJaar(j => j + 1)} style={navBtn}>{jaar + 1} ▶</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {MAANDEN.map((maand, mIdx) => {
              const weken = getWeeksInMonth(jaar, mIdx);
              return (
                <div key={mIdx} style={{
                  background: "#fff", border: "1px solid #e0e0e0",
                  borderRadius: "10px", padding: "0.75rem",
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "0.5rem", color: "#2c3e50" }}>
                    {maand}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {weken.map((week) => {
                      const isHuidig = week === todayWeek && jaar === today.getFullYear();
                      const isGeselecteerd = week === geselecteerdeWeek;
                      return (
                        <button
                          key={week}
                          onClick={() => { setGeselecteerdeWeek(week); setToonKalender(false); setGeselecteerdeDag(null); }}
                          style={{
                            padding: "3px 8px", borderRadius: "6px", border: "none",
                            background: isGeselecteerd ? "#2c3e50" : isHuidig ? "#2196F3" : "#f0f0f0",
                            color: (isGeselecteerd || isHuidig) ? "white" : "#333",
                            cursor: "pointer", fontSize: "0.8rem", fontWeight: (isGeselecteerd || isHuidig) ? "bold" : "normal",
                          }}
                        >
                          W{week}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Weekweergave ── */}
      {geselecteerdeWeek !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {weekDagen.map((dag, dagIdx) => {
            const dagKey = `dag${dagIdx}`;
            const entries = dagRoosters[dagKey] ?? [];
            const isVandaag = dag.toDateString() === today.toDateString();
            const isOpen = geselecteerdeDag === dagIdx;

            return (
              <div key={dagIdx} style={{
                background: "#fff", border: `2px solid ${isVandaag ? "#2196F3" : "#e0e0e0"}`,
                borderRadius: "10px", overflow: "hidden",
              }}>
                <div
                  onClick={() => setGeselecteerdeDag(isOpen ? null : dagIdx)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.75rem 1rem", cursor: "pointer",
                    background: isVandaag ? "#e3f2fd" : "#fafafa",
                  }}
                >
                  <div style={{ fontWeight: "bold", color: isVandaag ? "#1976D2" : "#2c3e50" }}>
                    {DAGEN_KORT[dagIdx]} {dag.getDate()}/{dag.getMonth() + 1}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {entries.length > 0 && (
                      <span style={{ fontSize: "0.8rem", color: "#666" }}>
                        {entries.map(e => e.naam).join(", ")}
                      </span>
                    )}
                    <span style={{ color: "#aaa" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #eee" }}>
                    {entries.length === 0 && (
                      <p style={{ color: "#aaa", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
                        Nog niemand ingeroosterd.
                      </p>
                    )}
                    {entries.map((e, eIdx) => (
                      <div key={eIdx} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "0.4rem 0", borderBottom: "1px solid #f0f0f0",
                      }}>
                        <span style={{ fontWeight: "500" }}>{e.naam}</span>
                        <span style={{ color: "#555", fontSize: "0.85rem" }}>{e.van} – {e.tot}</span>
                        <button
                          onClick={() => verwijder(dagIdx, eIdx)}
                          style={{ background: "none", border: "none", color: "#d9534f", cursor: "pointer" }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                      <input
                        placeholder="Naam"
                        value={nieuwNaam}
                        onChange={e => setNieuwNaam(e.target.value)}
                        style={inputStyle}
                      />
                      <input
                        type="time"
                        value={nieuwVan}
                        onChange={e => setNieuwVan(e.target.value)}
                        style={{ ...inputStyle, width: "100px", flex: "none" }}
                      />
                      <input
                        type="time"
                        value={nieuwTot}
                        onChange={e => setNieuwTot(e.target.value)}
                        style={{ ...inputStyle, width: "100px", flex: "none" }}
                      />
                      <button
                        onClick={() => voegToe(dagIdx)}
                        style={{
                          background: "#4CAF50", color: "white", border: "none",
                          padding: "0.4rem 0.75rem", borderRadius: "6px", cursor: "pointer",
                        }}
                      >
                        + Toevoegen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "#eee", border: "none", borderRadius: "6px",
  padding: "0.4rem 0.75rem", cursor: "pointer", fontWeight: "bold",
};

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem", borderRadius: "6px",
  border: "1px solid #ccc", fontSize: "0.9rem", flex: 1, minWidth: "80px",
};