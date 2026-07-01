import { useState, useEffect, useRef } from "react";
import "./App.css";

const TOP_BAR_H = 64;
const BOTTOM_BAR_H = 200;

// fixed palette — color is determined by (value % PALETTE.length), so it
// loops back to the start instead of drifting into mud at high values
const PALETTE = [
  "#e63946", // red
  "#f4a261", // orange
  "#e9c46a", // yellow
  "#2a9d8f", // teal
  "#264653", // deep blue
  "#577590", // slate
  "#9c6644", // brown
  "#b5179e", // magenta
  "#f72585", // pink
  "#7209b7", // purple
];

const UPGRADES = [
  { id: "power1", name: "Heavier Click", desc: "+1 click power", baseCost: 20, power: 1/2 },
  { id: "ballSpeed", name: "Ball Speed", desc: "+1 ball speed", baseCost: 50, speed: 1 },
];

// --- difficulty scaling, infinite levels ---

function getBallValue(level) {
  const base = 2 * level - 1; // 1, 3, 5, 7...
  const scaling = level > 2 ? Math.pow(1.25, level - 2) : 1;
  return Math.round(base * scaling);
}

function getBallCount(level) {
  return Math.min(10 + Math.floor(level / 2), 30);
}

function getBallRadius(level) {
  return Math.max(50 - level * 0.8, 22); // floor so balls stay tappable
}

function getBallColor(value) {
  // mod into the fixed palette so colors loop predictably forever
  const idx = ((value % PALETTE.length) + PALETTE.length) % PALETTE.length;
  return PALETTE[idx];
}

// upgrade cost scales per-purchase so the shop doesn't trivialize late levels
function getUpgradeCost(upg, ownedCount) {
  return Math.round(upg.baseCost * Math.pow(1.4, ownedCount));
}

function App() {
  const canvasRef = useRef(null);
  const circlesRef = useRef([]);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [ballSpeed, setBallSpeed] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(0);
  const [owned, setOwned] = useState({});
  const clickPowerRef = useRef(clickPower);
  const [openUpgrades, setOpenUpgrades] = useState(true);
  const [openBalls, setOpenBalls] = useState(false);

  useEffect(() => {
    clickPowerRef.current = clickPower;
  }, [clickPower]);

  function isInside(mx, my, cx, cy, r) {
    const dx = mx - cx;
    const dy = my - cy;
    return dx * dx + dy * dy <= r * r;
  }

  function buyUpgrade(upg) {
    const ownedCount = owned[upg.id] || 0;
    const cost = getUpgradeCost(upg, ownedCount);
    setScore((s) => {
      if (s < cost) return s;
      if (upg.power) setClickPower((p) => p + upg.power);
      if (upg.speed) setBallSpeed((sp) => sp + upg.speed);
      setOwned((o) => ({ ...o, [upg.id]: ownedCount + 1 }));
      return s - cost;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - TOP_BAR_H - BOTTOM_BAR_H;
      draw();
    }

    const count = getBallCount(level);
    const radius = getBallRadius(level);
    const value = getBallValue(level);

    const circles = [];
    for (let i = 0; i < count; i++) {
      circles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * (window.innerHeight - TOP_BAR_H - BOTTOM_BAR_H),
        r: radius,
        value,
      });
    }
    circlesRef.current = circles;
    setBallsLeft(circles.length);

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      circlesRef.current.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = getBallColor(c.value);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "700 18px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.value, c.x, c.y);
      });
    }

    resize();
    window.addEventListener("resize", resize);

    function getMousePos(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handleClick(e) {
      const { x, y } = getMousePos(e);
      const circles = circlesRef.current;

      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        if (isInside(x, y, c.x, c.y, c.r)) {
          const dealt = Math.min(c.value, clickPowerRef.current);
          c.value -= clickPowerRef.current;
          setScore((s) => s + dealt);

          if (c.value <= 0) {
            circles.splice(i, 1);
            setBallsLeft(circles.length);
          }
          draw();

          if (circles.length === 0) {
            setLevel((l) => l + 1); // no cap — infinite levels
          }
          break;
        }
      }
    }

    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("resize", resize);
    };
  }, [level]);

  return (
    <div style={{ background: "#0c0d10", height: "100vh", overflow: "hidden" }}>
      {/* TOP STAT BAR */}
      <div
        style={{
          height: TOP_BAR_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "#15171c",
          borderBottom: "2px solid #2ee6a6",
          color: "#fff",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <Stat label="LEVEL" value={level} />
        <Stat label="BALLS LEFT" value={ballsLeft} />
        <Stat label="SCORE" value={score} accent />
        <Stat label="POWER" value={clickPower} />
      </div>

      {/* CANVAS */}
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* BOTTOM PANEL */}
      <div
        style={{
          height: BOTTOM_BAR_H,
          background: "#15171c",
          borderTop: "2px solid #2ee6a6",
          padding: "10px 14px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <TabButton
            label="UPGRADES"
            active={openUpgrades}
            onClick={() => {
              setOpenUpgrades(true);
              setOpenBalls(false);
            }}
          />
          <TabButton
            label="BALLS"
            active={openBalls}
            onClick={() => {
              setOpenBalls(true);
              setOpenUpgrades(false);
            }}
          />
        </div>

        <div
          style={{
            height: BOTTOM_BAR_H - 50,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {openUpgrades &&
            UPGRADES.map((upg) => {
              const ownedCount = owned[upg.id] || 0;
              const cost = getUpgradeCost(upg, ownedCount);
              const affordable = score >= cost;
              return (
                <button
                  key={upg.id}
                  onClick={() => buyUpgrade(upg)}
                  disabled={!affordable}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: affordable ? "#1d2027" : "#191a1f",
                    border: "1px solid #2a2d35",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: affordable ? "#fff" : "#555",
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: affordable ? "pointer" : "not-allowed",
                    textAlign: "left",
                  }}
                >
                  <span>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{upg.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {upg.desc}
                      {ownedCount ? ` · owned x${ownedCount}` : ""}
                    </div>
                  </span>
                  <span
                    style={{
                      color: affordable ? "#2ee6a6" : "#555",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {cost}
                  </span>
                </button>
              );
            })}

          {openBalls &&
            Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => {
              const val = getBallValue(lvl);
              const isCurrent = lvl === level;
              return (
                <div
                  key={lvl}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: isCurrent ? "#1d2b25" : "#1d2027",
                    border: isCurrent ? "1px solid #2ee6a6" : "1px solid #2a2d35",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: getBallColor(val),
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#fff", fontSize: 13 }}>
                    Level {lvl}
                    {isCurrent ? " · current" : ""}
                  </span>
                  <span style={{ color: "#888", fontSize: 12, marginLeft: "auto" }}>
                    value {val}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 1 }}>{label}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: accent ? "#2ee6a6" : "#fff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? "#2ee6a6" : "#1d2027",
        color: active ? "#0c0d10" : "#888",
        border: "1px solid #2a2d35",
        borderRadius: 6,
        padding: "6px 0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default App;