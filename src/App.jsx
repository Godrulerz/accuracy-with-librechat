import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine } from "recharts";
import { Upload, Target, Rocket, BarChart3, RefreshCcw, Settings2, Filter } from "lucide-react";

// --- shadcn/ui imports ---
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MockLibreChat from "@/components/MockLibreChat";
import useLibreChatIntegration from "@/hooks/useLibreChatIntegration";

// -------------------------
// Mock seed data (basketball free throws)
// -------------------------
const SEED = Array.from({ length: 60 }).map((_, i) => {
  // create clustered errors with slight drift after 30 shots
  const base = i < 30 ? 6 : 9; // cm
  const angleMean = i < 30 ? 51.5 : 49.5;
  const jitter = () => (Math.random() - 0.5) * base;
  const x = jitter();
  const y = jitter();
  const err = Math.sqrt(x * x + y * y);
  const hit = err <= 11; // treat 11cm radius as make
  return {
    id: `a-${i}`,
    t: i + 1,
    hit,
    err: Number(err.toFixed(2)),
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    releaseDeg: Number((angleMean + (Math.random() - 0.5) * 2.8).toFixed(2)),
    speed: Number((7 + (Math.random() - 0.5) * 0.6).toFixed(2)),
  };
});

// -------------------------
// Helpers
// -------------------------
function mean(nums) {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}
function std(nums) {
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2)) || 0);
}
function pct(n, d) {
  return d ? (n / d) * 100 : 0;
}

function rollingAccuracy(data, window = 10) {
  const out = [];
  for (let i = 0; i < data.length; i++) {
    const from = Math.max(0, i - window + 1);
    const slice = data.slice(from, i + 1);
    const acc = pct(slice.filter((d) => d.hit).length, slice.length);
    out.push({ t: data[i].t, acc: Number(acc.toFixed(1)) });
  }
  return out;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

// Heatmap bins for shot chart (target plane)
function toBins(data, size = 6) {
  const binKey = (x, y) => `${Math.round(x / size)}_${Math.round(y / size)}`;
  const g = groupBy(data, (d) => binKey(d.x, d.y));
  return Object.entries(g).map(([k, items]) => {
    const [bx, by] = k.split("_").map((s) => Number(s));
    return { bx, by, count: items.length, makes: items.filter((i) => i.hit).length };
  });
}

// -------------------------
// UI Components
// -------------------------
function KPI({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/70 dark:bg-zinc-900 shadow-sm border">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// -------------------------
// Main Component
// -------------------------
export default function SportsAccuracyDashboard() {
  const [attempts, setAttempts] = useState(SEED);
  const [sport, setSport] = useState("basketball");
  const [windowSize, setWindowSize] = useState(10);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = attempts.length;
    const makes = attempts.filter((a) => a.hit).length;
    const acc = pct(makes, total);
    const mre = mean(attempts.map((a) => a.err)); // mean radial error (cm)
    const spread = std(attempts.map((a) => a.err));
    const releaseAvg = mean(attempts.map((a) => a.releaseDeg ?? 0));
    const releaseSd = std(attempts.map((a) => a.releaseDeg ?? 0));
    return {
      total,
      makes,
      acc: Number(acc.toFixed(1)),
      mre: Number(mre.toFixed(2)),
      spread: Number(spread.toFixed(2)),
      releaseAvg: Number(releaseAvg.toFixed(2)),
      releaseSd: Number(releaseSd.toFixed(2)),
    };
  }, [attempts]);

  // LibreChat integration
  const {
    isChatOpen,
    toggleChat,
    dashboardData,
    isLoading: chatLoading,
    handleDataRequest,
    getCoachingInsights,
    getPracticeRecommendations
  } = useLibreChatIntegration(attempts, metrics);

  const trend = useMemo(() => rollingAccuracy(attempts, windowSize), [attempts, windowSize]);
  const bins = useMemo(() => toBins(attempts, 6), [attempts]);

  // Skill radar (toy example)
  const radar = [
    { metric: "Stability", value: 70 },
    { metric: "Consistency", value: Math.max(0, 100 - metrics.spread * 4) },
    { metric: "Focus", value: 72 },
    { metric: "Technique", value: Math.max(0, 100 - Math.abs(52 - metrics.releaseAvg) * 6) },
    { metric: "Fatigue Res.", value: 68 },
  ];

  function parseCSV(text) {
    // expects headers: t,hit,err,x,y,releaseDeg,speed
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift()?.split(",").map((h) => h.trim().toLowerCase()) || [];
    const get = (obj, k) => Number(obj[k] ?? "");
    const out = lines.map((line, i) => {
      const vals = line.split(",").map((v) => v.trim());
      const row = {};
      header.forEach((h, idx) => (row[h] = vals[idx] ?? ""));
      const hit = (row["hit"] ?? "").toLowerCase();
      return {
        id: `u-${i}`,
        t: Number(row["t"]) || i + 1,
        hit: hit === "1" || hit === "true" || hit === "yes",
        err: get(row, "err") || Math.sqrt(get(row, "x") ** 2 + get(row, "y") ** 2),
        x: get(row, "x"),
        y: get(row, "y"),
        releaseDeg: get(row, "releasedeg"),
        speed: get(row, "speed"),
      };
    });
    return out;
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCSV(text).filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y));
      if (parsed.length) setAttempts(parsed);
      else alert("No valid rows detected. Expect headers: t,hit,err,x,y,releaseDeg,speed");
    };
    reader.readAsText(file);
  }

  function resetData() {
    setAttempts(SEED);
  }

  // sport presets (affect guidance copy + target radius for visualization)
  const targetRadiusCm = sport === "archery" ? 6 : sport === "darts" ? 2.5 : 11;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-7 w-7" /> Aiming & Accuracy Dashboard
            </h1>
            <p className="text-sm text-zinc-500">Load session data, analyze accuracy, get actionable coaching cues.</p>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={sport} 
              onChange={(e) => setSport(e.target.value)}
              className="flex h-10 w-36 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="basketball">Basketball</option>
              <option value="archery">Archery</option>
              <option value="darts">Darts</option>
            </select>

            <Label htmlFor="file" className="sr-only">Upload CSV</Label>
            <Button asChild variant="outline" className="gap-2">
              <label htmlFor="file"><Upload className="h-4 w-4"/> Import CSV</label>
            </Button>
            <input id="file" type="file" accept=".csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}/>

            <Button variant="ghost" className="gap-2" onClick={resetData} title="Reset to sample data">
              <RefreshCcw className="h-4 w-4"/> Reset
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Attempts" value={`${metrics.total}`} hint="total shots"/>
          <KPI label="Accuracy" value={`${metrics.acc.toFixed(1)}%`} hint={`${metrics.makes} makes`}/>
          <KPI label="Mean Radial Error" value={`${metrics.mre} cm`} hint="lower is better"/>
          <KPI label="Release Angle" value={`${metrics.releaseAvg}° ± ${metrics.releaseSd}`} hint="target ~52° (basketball)"/>
        </div>

        {/* Controls */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-600"><Filter className="h-4 w-4"/> Analysis Controls</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Label className="min-w-28">Rolling window</Label>
                <Input type="number" min={3} max={30} value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value || 10))} className="w-28"/>
                <span className="text-sm text-zinc-500">attempts</span>
              </div>
              <div className="text-sm text-zinc-500 md:col-span-2">
                Tip: Use a smaller window to see quicker accuracy swings; larger for stability.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Section title="Accuracy Trend" icon={<BarChart3 className="h-5 w-5"/>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="acc" name={`Acc % (window=${windowSize})`} dot={false} />
                  <ReferenceLine y={50} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Release Angle vs Hit" icon={<Settings2 className="h-5 w-5"/>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="releaseDeg" name="Release (°)" tick={{ fontSize: 12 }} />
                  <YAxis type="number" dataKey="err" name="Error (cm)" tick={{ fontSize: 12 }} />
                  <ZAxis type="category" dataKey="hit" name="Hit" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={attempts} name="Attempts" />
                  <ReferenceLine x={52} strokeDasharray="4 4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Skill Profile" icon={<Rocket className="h-5 w-5"/>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="80%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis />
                  <Radar name="Score" dataKey="value" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Shot Grouping (Target Plane)">
            <div className="h-80 flex items-center justify-center">
              <TargetPlane attempts={attempts} targetRadius={targetRadiusCm} />
            </div>
            <p className="text-xs text-zinc-500 mt-3">Dot = attempt impact relative to target center (cm). Ring ≈ make radius for selected sport.</p>
          </Section>

          <Section title="Coaching Cues">
            <CoachingCues metrics={metrics} sport={sport} />
          </Section>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-xs text-zinc-500 text-center space-y-2">
          <div>
            CSV schema: <code>t,hit,err,x,y,releaseDeg,speed</code> — hit accepts 1/true/yes.
          </div>
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
            Developed by{' '}
            <a 
              href="https://godz.rf.gd/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
            >
              Godrulerz
            </a>
          </div>
        </motion.div>
      </div>

      {/* AI Sports Coach Chat */}
      <MockLibreChat 
        isOpen={isChatOpen}
        onToggle={toggleChat}
        dashboardData={dashboardData}
        onDataRequest={handleDataRequest}
      />
    </div>
  );
}

function CoachingCues({ metrics, sport }) {
  const cues = [];

  if (metrics.acc < 70) cues.push("Prioritize mechanics over volume: slow reps with form checks.");
  if (metrics.mre > 8) cues.push("Tighten grouping: reduce excess motion with core + wrist stability drills.");
  if (Math.abs(52 - metrics.releaseAvg) > 2 && sport === "basketball") cues.push("Converge release angle toward ~52°; use pause-and-hold drill at peak.");
  if (metrics.spread > 6) cues.push("Consistency work: 10x10 drill; log every shot and rest 60s between sets.");
  if (!cues.length) cues.push("Maintain current plan. Add light pressure sets (timer/crowd noise) for robustness.");

  const plans = [
    {
      title: "Daily Micro-Session (15min)",
      items: [
        "5min movement prep: ankles, hips, T-spine",
        "6min technique: slow reps, camera from front + side",
        "4min constraints: smaller target or increased distance",
      ],
    },
    {
      title: "Consistency Block (2x/week)",
      items: [
        "100-attempt protocol: split 5x20 with 2min rest",
        "Record release angle every 5 attempts",
        "Stop if technique drops >2 cues; resume after reset",
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <h4 className="font-medium">Key Focus</h4>
        <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300">
          {cues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Practice Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((p, i) => (
            <div key={i} className="rounded-xl border p-3 bg-white/60 dark:bg-zinc-900">
              <div className="font-medium mb-1">{p.title}</div>
              <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300">
                {p.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Progress Check</h4>
        <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300">
          <li>Accuracy trend ≥ +5% over last 3 sessions</li>
          <li>Mean radial error ↓ by ≥ 2 cm</li>
          <li>Release angle variance ≤ 2° (sport-dependent)</li>
        </ul>
      </div>
    </div>
  );
}

function TargetPlane({ attempts, targetRadius }) {
  // SVG target plane, cm scaled into viewBox space
  const w = 360;
  const h = 360;
  const scale = 6; // px per cm
  const cx = w / 2;
  const cy = h / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full rounded-2xl border bg-white/60 dark:bg-zinc-900">
      {/* crosshair grid */}
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" opacity="0.08"/>
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#grid)" />

      {/* target rings */}
      <circle cx={cx} cy={cy} r={targetRadius * scale} className="stroke-zinc-400" fill="none" strokeDasharray="6 4" />
      <circle cx={cx} cy={cy} r={2} fill="currentColor" opacity={0.6} />

      {/* attempts */}
      {attempts.map((a) => {
        const px = cx + a.x * scale;
        const py = cy - a.y * scale;
        return (
          <g key={a.id}>
            <circle cx={px} cy={py} r={4} fill={a.hit ? "#10b981" : "#ef4444"} opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}
