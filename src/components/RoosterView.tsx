import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

interface RoosterEntry {
  naam: string;
  start: string;
  eind: string;
}

interface DagRooster {
  [dag: string]: RoosterEntry[];
}

interface WeekDoc {
  entries: DagRooster;
}

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

function getWeekKey(date: Date): string {
  // ISO week — maandag als startdag
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getMondayOfWeek(weekKey: string): Date {
  const [year, weekPart] = weekKey.split("-W");
  const week = parseInt(weekPart, 10);
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

export default function RoosterView() {
  const [weekKey, setWeekKey] = useState<string>(getWeekKey(new Date()));
  const [rooster, setRooster] = useState<DagRooster>({});
  const [openDag, setOpenDag] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [start, setStart] = useState("09:00");
  const [eind, setEind] = useState("17:00");

  // Herhaling state
  const [toonHerhaling, setToonHerhaling] = useState<string | null>(null); // dag-naam
  const [herhalingInterval, setHerhalingInterval] = useState(1);
  const [herhalingEindDatum, setHerhalingEindDatum] = useState("");
  const [herhalingBezig, setHerhalingBezig] = useState(false);

  // Kalender toggle
  const [toonKalender, setToonKalender] = useState(false);

  useEffect(() => {
    laadWeek(weekKey);
  }, [weekKey]);

  async function laadWeek(key: string) {
    const ref = doc(db, "rooster", key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setRooster((snap.data() as WeekDoc).entries || {});
    } else {
      setRooster({});
    }
  }

  async function voegToe(dag: string) {
    if (!naam.trim()) return;
    const entry: RoosterEntry = { naam: naam.trim(), start, eind };
    const updated = {
      ...rooster,
      [dag]: [...(rooster[dag] || []), entry],
    };
    setRooster(updated);
    const ref = doc(db, "rooster", weekKey);
    await setDoc(ref, { entries: updated }, { merge: true });
    setNaam("");
  }

  async function verwijder(dag: string, index: number) {
    const updated = {
      ...rooster,
      [dag]: (rooster[dag] || []).filter((_, i) => i !== index),
    };
    setRooster(updated);
    const ref = doc(db, "rooster", weekKey);
    await setDoc(ref, { entries: updated }, { merge: true });
  }

  async function voegHerhalingToe(dag: string) {
    if (!naam.trim()) {
      alert("Vul eerst een naam in.");
      return;
    }
    if (!herhalingEindDatum) {
      alert("Vul een einddatum in voor de herhaling.");
      return;
    }

    const eindDate = new Date(herhalingEindDatum);
    eindDate.setHours(23, 59, 59);
    const entry: RoosterEntry = { naam: naam.trim(), start, eind };
    const dagIndex = DAYS.indexOf(dag);

    setHerhalingBezig(true);

    let maandag = getMondayOfWeek(weekKey);
    let teller = 0;

    while (true) {
      const dagDatum = new Date(maandag);
      dagDatum.setDate(maandag.getDate() + dagIndex);

      if (dagDatum > eindDate) break;
      if (teller > 104) break; // veiligheidsgrens: max 2 jaar weken

      const key = getWeekKey(dagDatum);
      const ref = doc(db, "rooster", key);
      const snap = await getDoc(ref);
      const bestaand: DagRooster = snap.exists() ? (snap.data() as WeekDoc).entries || {} : {};
      const bijgewerkt = {
        ...bestaand,
        [dag]: [...(bestaand[dag] || []), entry],
      };
      await setDoc(ref, { entries: bijgewerkt }, { merge: true });

      // Als het de huidige week is, update lokale state ook
      if (key === weekKey) {
        setRooster(bijgewerkt);
      }

      maandag = addWeeks(maandag, herhalingInterval);
      teller++;
    }

    setHerhalingBezig(false);
    setToonHerhaling(null);
    setNaam("");
    alert(`✅ Herhaling toegevoegd voor ${teller} week(en).`);
  }

  const monday = getMondayOfWeek(weekKey);

  function prevWeek() {
    setWeekKey(getWeekKey(addWeeks(monday, -1)));
  }
  function nextWeek() {
    setWeekKey(getWeekKey(addWeeks(monday, 1)));
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 700, margin: "0 auto" }}>
      {/* Week navigatie */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={prevWeek} style={navBtnStyle}>◀</button>
        <strong style={{ fontSize: 18 }}>
          Week {weekKey.split("-W")[1]} — {monday.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </strong>
        <button onClick={nextWeek} style={navBtnStyle}>▶</button>
        <button
          onClick={() => setToonKalender(!toonKalender)}
          style={{ ...navBtnStyle, marginLeft: "auto" }}
        >
          📅 {toonKalender ? "Verberg" : "Kalender"}
        </button>
      </div>

      {/* Simpele week-picker kalender */}
      {toonKalender && (
        <WeekPicker
          currentKey={weekKey}
          onSelect={(key) => { setWeekKey(key); setToonKalender(false); }}
        />
      )}

      {/* Dagen */}
      {DAYS.map((dag, dagIndex) => {
        const dagDatum = new Date(monday);
        dagDatum.setDate(monday.getDate() + dagIndex);
        const isOpen = openDag === dag;
        const entries = rooster[dag] || [];

        return (
          <div key={dag} style={{ marginBottom: 8, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
            {/* Dag header */}
            <div
              onClick={() => { setOpenDag(isOpen ? null : dag); setToonHerhaling(null); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", cursor: "pointer",
                background: isOpen ? "#f0f4ff" : "#fafafa",
              }}
            >
              <strong>{dag} {dagDatum.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</strong>
              <span style={{ color: "#888", fontSize: 13 }}>
                {entries.length > 0 ? `${entries.length} medewerker(s)` : "Vrij"} {isOpen ? "▲" : "▼"}
              </span>
            </div>

            {/* Detail panel */}
            {isOpen && (
              <div style={{ padding: "12px 14px", background: "#fff" }}>
                {/* Bestaande entries */}
                {entries.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 }}>
                    <span style={{ flex: 1 }}>{e.naam}</span>
                    <span style={{ color: "#555" }}>{e.start}–{e.eind}</span>
                    <button onClick={() => verwijder(dag, i)} style={deleteBtnStyle}>✕</button>
                  </div>
                ))}

                {/* Toevoegen rij */}
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    value={naam}
                    onChange={e => setNaam(e.target.value)}
                    placeholder="Naam medewerker"
                    style={inputStyle}
                    onKeyDown={e => e.key === "Enter" && voegToe(dag)}
                  />
                  <input type="time" value={start} onChange={e => setStart(e.target.value)} style={{ ...inputStyle, width: 100 }} />
                  <input type="time" value={eind} onChange={e => setEind(e.target.value)} style={{ ...inputStyle, width: 100 }} />
                  <button onClick={() => voegToe(dag)} style={addBtnStyle}>+ Toevoegen</button>
                  <button
                    onClick={() => setToonHerhaling(toonHerhaling === dag ? null : dag)}
                    style={{ ...addBtnStyle, background: toonHerhaling === dag ? "#7c5cbf" : "#9b72cf" }}
                    title="Voeg herhalende dienst toe"
                  >
                    🔁 Herhalen
                  </button>
                </div>

                {/* Herhaling panel */}
                {toonHerhaling === dag && (
                  <div style={{
                    marginTop: 10, padding: 12, background: "#f5f0ff",
                    borderRadius: 8, border: "1px solid #c9b0ef"
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: "#5a3d9a" }}>
                      🔁 Herhalende dienst instellen
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <label style={{ fontSize: 13 }}>
                        Elke
                        <input
                          type="number"
                          min={1}
                          max={52}
                          value={herhalingInterval}
                          onChange={e => setHerhalingInterval(parseInt(e.target.value) || 1)}
                          style={{ ...inputStyle, width: 60, marginLeft: 6, marginRight: 6 }}
                        />
                        week(en)
                      </label>
                      <label style={{ fontSize: 13 }}>
                        Tot en met
                        <input
                          type="date"
                          value={herhalingEindDatum}
                          onChange={e => setHerhalingEindDatum(e.target.value)}
                          style={{ ...inputStyle, marginLeft: 6 }}
                        />
                      </label>
                      <button
                        onClick={() => voegHerhalingToe(dag)}
                        disabled={herhalingBezig}
                        style={{ ...addBtnStyle, background: herhalingBezig ? "#aaa" : "#5a3d9a" }}
                      >
                        {herhalingBezig ? "Bezig…" : "✅ Opslaan"}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
                      Voegt {naam || "[naam]"} toe aan elke {herhalingInterval === 1 ? "" : `${herhalingInterval}e `}{dag} van de huidige week t/m de einddatum.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Simpele jaar-kalender week-picker
function WeekPicker({ currentKey, onSelect }: { currentKey: string; onSelect: (key: string) => void }) {
  const jaar = parseInt(currentKey.split("-W")[0], 10);
  const [viewYear, setViewYear] = useState(jaar);

  const weken: string[] = [];
  for (let w = 1; w <= 53; w++) {
    const key = `${viewYear}-W${String(w).padStart(2, "0")}`;
    const monday = getMondayOfWeek(key);
    // skip week 53 als die niet bestaat
    if (monday.getFullYear() > viewYear && w === 53) break;
    weken.push(key);
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16, background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button onClick={() => setViewYear(y => y - 1)} style={navBtnStyle}>◀</button>
        <strong>{viewYear}</strong>
        <button onClick={() => setViewYear(y => y + 1)} style={navBtnStyle}>▶</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 4 }}>
        {weken.map(key => {
          const mon = getMondayOfWeek(key);
          const weekNr = key.split("-W")[1];
          const isSelected = key === currentKey;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                padding: "4px 6px", fontSize: 12, borderRadius: 4, cursor: "pointer",
                background: isSelected ? "#4f6ef7" : "#fff",
                color: isSelected ? "#fff" : "#333",
                border: "1px solid #ccc",
                textAlign: "left",
              }}
            >
              W{weekNr} — {mon.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Styles
const navBtnStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc",
  background: "#fff", cursor: "pointer", fontSize: 14,
};
const inputStyle: React.CSSProperties = {
  padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14,
};
const addBtnStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "none",
  background: "#4f6ef7", color: "#fff", cursor: "pointer", fontSize: 14,
};
const deleteBtnStyle: React.CSSProperties = {
  padding: "2px 7px", borderRadius: 4, border: "none",
  background: "#fee", color: "#c00", cursor: "pointer", fontSize: 13,
};