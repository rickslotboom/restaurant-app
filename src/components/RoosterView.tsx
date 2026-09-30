import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

interface RoosterEntry {
  naam: string;
  start: string;
  eind: string;
  herhalingId?: string; // koppeling naar de reeks
}

interface DagRooster {
  [dag: string]: RoosterEntry[];
}

interface WeekDoc {
  entries: DagRooster;
}

interface Herhaling {
  id: string;
  dag: string;
  naam: string;
  start: string;
  eind: string;
  interval: number;
  eindDatum: string;
  startWeek: string;
}

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

function getWeekKey(date: Date): string {
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

type Tab = "rooster" | "herhalingen";

export default function RoosterView() {
  const [tab, setTab] = useState<Tab>("rooster");
  const [weekKey, setWeekKey] = useState<string>(getWeekKey(new Date()));
  const [rooster, setRooster] = useState<DagRooster>({});
  const [herhalingen, setHerhalingen] = useState<Herhaling[]>([]);
  const [openDag, setOpenDag] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [start, setStart] = useState("09:00");
  const [eind, setEind] = useState("16:00");

  // Herhaling state
  const [toonHerhaling, setToonHerhaling] = useState<string | null>(null);
  const [herhalingInterval, setHerhalingInterval] = useState(1);
  const [herhalingEindDatum, setHerhalingEindDatum] = useState("");
  const [herhalingBezig, setHerhalingBezig] = useState(false);
  const [verwijderBezig, setVerwijderBezig] = useState<string | null>(null);

  // Kalender toggle
  const [toonKalender, setToonKalender] = useState(false);

  useEffect(() => {
    laadWeek(weekKey);
  }, [weekKey]);

  useEffect(() => {
    laadHerhalingen();
  }, []);

  async function laadWeek(key: string) {
    const ref = doc(db, "rooster", key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setRooster((snap.data() as WeekDoc).entries || {});
    } else {
      setRooster({});
    }
  }

  async function laadHerhalingen() {
    const snap = await getDocs(collection(db, "rooster-herhalingen"));
    const lijst: Herhaling[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Herhaling));
    lijst.sort((a, b) => a.dag.localeCompare(b.dag) || a.naam.localeCompare(b.naam));
    setHerhalingen(lijst);
  }

  async function voegToe(dag: string) {
    if (!naam.trim()) return;
    const entry: RoosterEntry = { naam: naam.trim(), start, eind };
    const updated = {
      ...rooster,
      [dag]: [...(rooster[dag] || []), entry],
    };
    setRooster(updated);
    await setDoc(doc(db, "rooster", weekKey), { entries: updated }, { merge: true });
    setNaam("");
  }

  async function verwijder(dag: string, index: number) {
    const updated = {
      ...rooster,
      [dag]: (rooster[dag] || []).filter((_, i) => i !== index),
    };
    setRooster(updated);
    await setDoc(doc(db, "rooster", weekKey), { entries: updated }, { merge: true });
  }

  async function voegHerhalingToe(dag: string) {
    if (!naam.trim()) { alert("Vul eerst een naam in."); return; }
    if (!herhalingEindDatum) { alert("Vul een einddatum in."); return; }

    const eindDate = new Date(herhalingEindDatum);
    eindDate.setHours(23, 59, 59);
    const entry: RoosterEntry = { naam: naam.trim(), start, eind };
    const dagIndex = DAYS.indexOf(dag);

    // Sla de reeks op in rooster-herhalingen
    const herhalingId = `${dag}-${naam.trim()}-${Date.now()}`;
    const herhalingDoc: Omit<Herhaling, "id"> = {
      dag,
      naam: naam.trim(),
      start,
      eind,
      interval: herhalingInterval,
      eindDatum: herhalingEindDatum,
      startWeek: weekKey,
    };
    await setDoc(doc(db, "rooster-herhalingen", herhalingId), herhalingDoc);

    setHerhalingBezig(true);

    let maandag = getMondayOfWeek(weekKey);
    let teller = 0;

    while (true) {
      const dagDatum = new Date(maandag);
      dagDatum.setDate(maandag.getDate() + dagIndex);

      if (dagDatum > eindDate) break;
      if (teller > 104) break;

      const key = getWeekKey(dagDatum);
      const ref = doc(db, "rooster", key);
      const snap = await getDoc(ref);
      const bestaand: DagRooster = snap.exists() ? (snap.data() as WeekDoc).entries || {} : {};
      const bijgewerkt = {
        ...bestaand,
        [dag]: [...(bestaand[dag] || []), { ...entry, herhalingId }],
      };
      await setDoc(ref, { entries: bijgewerkt }, { merge: true });

      if (key === weekKey) setRooster(bijgewerkt);

      maandag = addWeeks(maandag, herhalingInterval);
      teller++;
    }

    setHerhalingBezig(false);
    setToonHerhaling(null);
    setNaam("");
    await laadHerhalingen();
    alert(`✅ Herhaling opgeslagen voor ${teller} week(en).`);
  }

  async function verwijderHerhaling(herhaling: Herhaling) {
    if (!window.confirm(
      `Verwijder de volledige reeks "${herhaling.naam}" op ${herhaling.dag}?\n\n` +
      `Dit verwijdert de dienst uit alle toekomstige weken (vanaf vandaag). ` +
      `Weken in het verleden blijven staan.`
    )) return;

    setVerwijderBezig(herhaling.id);

    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    const eindDate = new Date(herhaling.eindDatum);
    eindDate.setHours(23, 59, 59);
    const dagIndex = DAYS.indexOf(herhaling.dag);

    let maandag = getMondayOfWeek(herhaling.startWeek);
    let teller = 0;

    while (true) {
      const dagDatum = new Date(maandag);
      dagDatum.setDate(maandag.getDate() + dagIndex);

      if (dagDatum > eindDate) break;
      if (teller > 104) break;

      // Alleen toekomstige weken aanpassen (inclusief deze week)
      if (dagDatum >= vandaag) {
        const key = getWeekKey(dagDatum);
        const ref = doc(db, "rooster", key);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as WeekDoc;
          const entries = data.entries || {};
          const gefilterd = {
            ...entries,
            [herhaling.dag]: (entries[herhaling.dag] || []).filter(
              e => e.herhalingId !== herhaling.id
            ),
          };
          await setDoc(ref, { entries: gefilterd }, { merge: true });
          if (key === weekKey) setRooster(gefilterd);
        }
      }

      maandag = addWeeks(maandag, herhaling.interval);
      teller++;
    }

    // Verwijder de reeks zelf
    await deleteDoc(doc(db, "rooster-herhalingen", herhaling.id));
    await laadHerhalingen();
    setVerwijderBezig(null);
    alert(`✅ Reeks verwijderd uit ${teller} week(en).`);
  }

  const monday = getMondayOfWeek(weekKey);

  function prevWeek() { setWeekKey(getWeekKey(addWeeks(monday, -1))); }
  function nextWeek() { setWeekKey(getWeekKey(addWeeks(monday, 1))); }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 700, margin: "0 auto" }}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "2px solid #e0e0e0" }}>
        {(["rooster", "herhalingen"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px",
              border: "none",
              borderBottom: tab === t ? "2px solid #4f6ef7" : "2px solid transparent",
              background: "none",
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? "#4f6ef7" : "#555",
              cursor: "pointer",
              fontSize: 15,
              marginBottom: -2,
            }}
          >
            {t === "rooster" ? "📅 Weekrooster" : `🔁 Herhalingen (${herhalingen.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB: WEEKROOSTER ── */}
      {tab === "rooster" && (
        <>
          {/* Week navigatie */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={prevWeek} style={navBtnStyle}>◀</button>
            <strong style={{ fontSize: 16 }}>
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

                {isOpen && (
                  <div style={{ padding: "12px 14px", background: "#fff" }}>
                    {entries.map((e, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 }}>
                        <span style={{ flex: 1 }}>{e.naam}</span>
                        {e.herhalingId && (
                          <span style={{ fontSize: 11, color: "#9b72cf", background: "#f5f0ff", padding: "1px 6px", borderRadius: 10 }}>
                            🔁 reeks
                          </span>
                        )}
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
                          Voegt {naam || "[naam]"} toe aan elke {herhalingInterval === 1 ? "" : `${herhalingInterval}e `}{dag} t/m de einddatum.
                          De reeks is terug te vinden (en te verwijderen) onder het tabblad "Herhalingen".
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── TAB: HERHALINGEN ── */}
      {tab === "herhalingen" && (
        <div>
          {herhalingen.length === 0 ? (
            <div style={{ color: "#888", padding: 24, textAlign: "center" }}>
              Geen herhalingen ingesteld. Voeg ze toe via het weekrooster (🔁 Herhalen knop).
            </div>
          ) : (
            herhalingen.map(h => (
              <div key={h.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", marginBottom: 8,
                border: "1px solid #e0d4f7", borderRadius: 8, background: "#faf7ff"
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{h.naam}</div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                    {h.dag} · {h.start}–{h.eind} · elke {h.interval === 1 ? "week" : `${h.interval} weken`}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 1 }}>
                    Vanaf week {h.startWeek.split("-W")[1]} t/m {new Date(h.eindDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <button
                  onClick={() => verwijderHerhaling(h)}
                  disabled={verwijderBezig === h.id}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "1px solid #e0a0a0",
                    background: verwijderBezig === h.id ? "#eee" : "#fff5f5",
                    color: verwijderBezig === h.id ? "#aaa" : "#c00",
                    cursor: verwijderBezig === h.id ? "default" : "pointer",
                    fontSize: 13, whiteSpace: "nowrap",
                  }}
                >
                  {verwijderBezig === h.id ? "Bezig…" : "🗑 Reeks verwijderen"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Simpele kalender week-picker
function WeekPicker({ currentKey, onSelect }: { currentKey: string; onSelect: (key: string) => void }) {
  const jaar = parseInt(currentKey.split("-W")[0], 10);
  const [viewYear, setViewYear] = useState(jaar);

  const weken: string[] = [];
  for (let w = 1; w <= 53; w++) {
    const key = `${viewYear}-W${String(w).padStart(2, "0")}`;
    const monday = getMondayOfWeek(key);
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