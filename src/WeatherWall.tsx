import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    CartesianGrid,
} from "recharts";
import {
    Cloud,
    CloudRain,
    Gauge,
    Sun,
    Wind,
    Umbrella,
    Compass,
    Droplets,
    Waves,
    AlertTriangle,
    Radio,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

type LocationState = {
    city: string;
    lat: number;
    lon: number;
};

type ThemeSettings = {
    fontScale: number;
    accent: "sky" | "emerald" | "violet" | "rose";
    density: "compact" | "normal" | "comfortable";
};

// ────────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────────
function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

function codeToInfo(code?: number) {
    const map: Record<number, { icon: React.ReactNode; label: string; bg: string }> = {
        0: { icon: <Sun className="w-6 h-6" />, label: "Sunny", bg: "from-amber-400/30 to-orange-600/20" },
        1: { icon: <Cloud className="w-6 h-6" />, label: "Cloudy", bg: "from-sky-300/20 to-blue-700/20" },
        2: { icon: <CloudRain className="w-6 h-6" />, label: "Rain", bg: "from-blue-400/30 to-indigo-700/20" },
        3: { icon: <AlertTriangle className="w-6 h-6" />, label: "Storm", bg: "from-yellow-400/30 to-red-700/20" },
        4: { icon: <Waves className="w-6 h-6" />, label: "Snow", bg: "from-slate-200/40 to-blue-300/20" },
    };
    return map[code ?? 1] ?? map[1];
}

function formatTime(ts?: string) {
    if (!ts) return "—";
    try {
        const d = new Date(ts);
        return d.toLocaleString();
    } catch {
        return ts;
    }
}

function smooth(prev: number | null, next: number, alpha = 0.35) {
    if (prev == null || Number.isNaN(prev)) return next;
    return prev * (1 - alpha) + next * alpha;
}

function deriveWeatherCode(cur: any): number {
    if (!cur) return 1;
    const precip = Number(cur.precipitation ?? 0);
    const cloud = Number(cur.cloud_cover ?? 0);
    const uvi = Number(cur.uv_index ?? 0);

    if (precip > 2) return 3;
    if (precip > 0.2) return 2;
    if (cloud > 75) return 1;
    if (uvi > 5) return 0;
    return 0;
}

function deriveAlert(cur: any): string {
    if (!cur) return "";
    const wind = Number(cur.wind_speed_10m ?? 0);
    const precip = Number(cur.precipitation ?? 0);
    const uvi = Number(cur.uv_index ?? 0);

    if (wind > 15) return "High wind";
    if (precip > 4) return "Heavy rain";
    if (uvi > 7) return "High UV index";
    return "";
}

function parseNumberInRange(raw: string | null, fallback: number, min: number, max: number) {
    if (raw == null || raw === "") return fallback;
    const n = Number(raw);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function parseAccent(raw: string | null): ThemeSettings["accent"] {
    const v = (raw || "").trim().toLowerCase();
    if (v === "emerald" || v === "violet" || v === "rose" || v === "sky") return v;
    return "sky";
}

function parseDensity(raw: string | null): ThemeSettings["density"] {
    const v = (raw || "").trim().toLowerCase();
    if (v === "compact" || v === "comfortable" || v === "normal") return v;
    return "normal";
}

function getThemeSettings(): ThemeSettings {
    const p = new URLSearchParams(window.location.search);

    return {
        fontScale: parseNumberInRange(p.get("fontScale"), 1, 0.85, 1.3),
        accent: parseAccent(p.get("accent")),
        density: parseDensity(p.get("density")),
    };
}

function getAccentClasses(accent: ThemeSettings["accent"]) {
    const map = {
        sky: {
            badge: "text-sky-300",
            line: "#93c5fd",
            line2: "#a5b4fc",
            bar: "#60a5fa",
            heroGlow:
                "bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.2),transparent_40%)]",
        },
        emerald: {
            badge: "text-emerald-300",
            line: "#6ee7b7",
            line2: "#34d399",
            bar: "#10b981",
            heroGlow:
                "bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(52,211,153,0.18),transparent_40%)]",
        },
        violet: {
            badge: "text-violet-300",
            line: "#c4b5fd",
            line2: "#a78bfa",
            bar: "#8b5cf6",
            heroGlow:
                "bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.16),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(167,139,250,0.18),transparent_40%)]",
        },
        rose: {
            badge: "text-rose-300",
            line: "#fda4af",
            line2: "#fb7185",
            bar: "#f43f5e",
            heroGlow:
                "bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.16),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(251,113,133,0.18),transparent_40%)]",
        },
    };
    return map[accent];
}

function getDensityClasses(density: ThemeSettings["density"]) {
    const map = {
        compact: {
            page: "space-y-4",
            outer: "p-4 lg:p-5",
            hero: "p-4",
            card: "p-3",
            chart: "p-3",
            metricGrid: "gap-3",
            chartGrid: "gap-4",
        },
        normal: {
            page: "space-y-6",
            outer: "p-6 lg:p-8",
            hero: "p-6",
            card: "p-4",
            chart: "p-4",
            metricGrid: "gap-4",
            chartGrid: "gap-6",
        },
        comfortable: {
            page: "space-y-8",
            outer: "p-8 lg:p-10",
            hero: "p-8",
            card: "p-5",
            chart: "p-5",
            metricGrid: "gap-5",
            chartGrid: "gap-8",
        },
    };
    return map[density];
}

// ────────────────────────────────────────────────────────────────────────────────
// Wind Compass
// ────────────────────────────────────────────────────────────────────────────────
function WindCompass({ dir = 0, speed = 0 }: { dir?: number; speed?: number }) {
    return (
        <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full border border-white/15" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">N</div>
            <motion.div
                className="absolute left-1/2 top-1/2 origin-bottom"
                animate={{ rotate: dir }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                style={{ transformOrigin: "bottom center" }}
            >
                <div className="-translate-x-1/2 -translate-y-10 w-0.5 h-10 bg-white" />
                <div className="-translate-x-1/2 -translate-y-10 w-2 h-2 bg-white rounded-full" />
            </motion.div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70">
                {speed.toFixed(1)} m/s
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────────
// Metric Card
// ────────────────────────────────────────────────────────────────────────────────
function MetricCard({
                        title,
                        value,
                        unit,
                        icon,
                        hint,
                        className,
                    }: {
    title: string;
    value: string | number | React.ReactNode;
    unit?: string;
    icon?: React.ReactNode;
    hint?: string;
    className?: string;
}) {
    return (
        <div className={clsx("rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm", className)}>
            <div className="flex items-center justify-between text-sm text-white/70">
                <span>{title}</span>
                <span className="opacity-70">{icon}</span>
            </div>
            <div className="mt-2 flex items-end gap-1">
                <div className="text-2xl font-semibold">{value}</div>
                {unit && <div className="mb-[2px] text-white/60">{unit}</div>}
            </div>
            {hint && <div className="mt-1 text-xs text-white/50">{hint}</div>}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────────
// Open-Meteo Hook
// ────────────────────────────────────────────────────────────────────────────────
function useWeatherStream(location: LocationState | null) {
    const [data, setData] = useState<Record<string, any>>({});
    const [status, setStatus] =
        useState<"connecting" | "connected" | "mock" | "error">("connecting");
    const [history, setHistory] = useState<
        Array<{ t: number; temp?: number; wind?: number; precip?: number; uvi?: number }>
    >([]);
    const prevRef = useRef<{ temp?: number; wind_speed?: number; precip?: number; uvi?: number }>({});

    useEffect(() => {
        if (!location) return;

        const currentLocation = location;
        let cancelled = false;
        let timer: number | undefined;

        async function fetchOnce() {
            try {
                const params = new URLSearchParams({
                    latitude: String(currentLocation.lat),
                    longitude: String(currentLocation.lon),
                    current:
                        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover,pressure_msl,visibility,uv_index",
                    timezone: "auto",
                });

                const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const j = await res.json();
                const cur = j.current;

                const next = {
                    ts: cur?.time ?? new Date().toISOString(),
                    temp: cur?.temperature_2m,
                    feels_like: cur?.apparent_temperature,
                    humidity: cur?.relative_humidity_2m,
                    wind_speed: cur?.wind_speed_10m,
                    wind_dir: cur?.wind_direction_10m,
                    precip: cur?.precipitation,
                    precip_prob: j?.hourly?.precipitation_probability?.[0] ?? null,
                    cloud: cur?.cloud_cover,
                    pressure: cur?.pressure_msl,
                    visibility: cur?.visibility,
                    uvi: cur?.uv_index,
                    weather_code: deriveWeatherCode(cur),
                    alert: deriveAlert(cur),
                    source: "open-meteo",
                };

                if (!cancelled) {
                    setData(next);
                    setStatus("connected");

                    const prev = prevRef.current;
                    const pt = {
                        t: Date.now(),
                        temp: smooth(prev.temp ?? null, Number(next.temp)),
                        wind: smooth(prev.wind_speed ?? null, Number(next.wind_speed)),
                        precip: smooth(prev.precip ?? null, Number(next.precip)),
                        uvi: smooth(prev.uvi ?? null, Number(next.uvi)),
                    };

                    prevRef.current = {
                        temp: pt.temp,
                        wind_speed: pt.wind,
                        precip: pt.precip,
                        uvi: pt.uvi,
                    };

                    setHistory((h) => [...h.slice(-240), pt]);
                }
            } catch (e) {
                console.warn("Open-Meteo fetch error", e);
                if (!cancelled) setStatus("error");
            }
        }

        setStatus("connecting");
        setHistory([]);
        prevRef.current = {};

        fetchOnce();
        timer = window.setInterval(fetchOnce, 60000);

        return () => {
            cancelled = true;
            if (timer) window.clearInterval(timer);
        };
    }, [location?.lat, location?.lon]);

    return { data, status, history } as const;
}

// ────────────────────────────────────────────────────────────────────────────────
// Particles
// ────────────────────────────────────────────────────────────────────────────────
function Particles() {
    const dots = useMemo(
        () =>
            Array.from({ length: 36 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                s: 3 + Math.random() * 8,
                d: 6 + Math.random() * 16,
                o: 0.15 + Math.random() * 0.25,
            })),
        []
    );
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {dots.map((d) => (
                <motion.div
                    key={d.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        width: d.s,
                        height: d.s,
                        left: `${d.x}%`,
                        top: `${d.y}%`,
                        opacity: d.o,
                    }}
                    animate={{
                        y: [0, -d.d, 0],
                        opacity: [d.o, d.o * 0.6, d.o],
                    }}
                    transition={{
                        duration: 6 + (d.id % 6),
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

function parsePageParams() {
    const p = new URLSearchParams(window.location.search);

    const rawInfo = p.get("info") || "";
    let infoObj: any = {};

    if (rawInfo) {
        try {
            infoObj = JSON.parse(rawInfo);
        } catch {
            infoObj = { city: rawInfo };
        }
    }

    const city = (p.get("city") ?? infoObj.city ?? "")?.toString().trim();

    const lonRaw =
        p.get("longitude") ??
        p.get("lon") ??
        infoObj.longitude ??
        infoObj.lon;

    const latRaw =
        p.get("latitude") ??
        p.get("lat") ??
        infoObj.latitude ??
        infoObj.lat;

    const lon =
        lonRaw !== undefined && lonRaw !== null && lonRaw !== ""
            ? Number(lonRaw)
            : undefined;

    const lat =
        latRaw !== undefined && latRaw !== null && latRaw !== ""
            ? Number(latRaw)
            : undefined;

    return {
        city,
        lat: typeof lat === "number" && !Number.isNaN(lat) ? lat : undefined,
        lon: typeof lon === "number" && !Number.isNaN(lon) ? lon : undefined,
    };
}

async function geocodeCity(city: string): Promise<LocationState | null> {
    const q = city.trim();
    if (!q) return null;

    const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);

    const j = await res.json();
    const first = j?.results?.[0];
    if (!first) return null;

    return {
        city: first.name || city,
        lat: Number(first.latitude),
        lon: Number(first.longitude),
    };
}

async function resolveInitialLocation(): Promise<LocationState> {
    const { city, lat, lon } = parsePageParams();

    if (typeof lat === "number" && typeof lon === "number") {
        return {
            city: city || `Lat ${lat}, Lon ${lon}`,
            lat,
            lon,
        };
    }

    if (city) {
        const geo = await geocodeCity(city);
        if (geo) return geo;
    }

    return {
        city: "Munich",
        lat: 48.137,
        lon: 11.575,
    };
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────────
export default function WeatherWall() {
    const [location, setLocation] = useState<LocationState | null>(null);
    const { data, status, history } = useWeatherStream(location);

    const theme = useMemo(() => getThemeSettings(), []);
    const accent = getAccentClasses(theme.accent);
    const density = getDensityClasses(theme.density);

    const info = codeToInfo(Number(data.weather_code ?? 1));

    const kpi = [
        { title: "Humidity", value: data.humidity ?? "—", unit: "%", icon: <Droplets className="w-4 h-4" /> },
        { title: "Precipitation", value: data.precip?.toFixed?.(2) ?? "—", unit: "mm", icon: <Umbrella className="w-4 h-4" /> },
        { title: "Pressure", value: data.pressure ?? "—", unit: "hPa", icon: <Gauge className="w-4 h-4" /> },
        { title: "Visibility", value: data.visibility ?? "—", unit: "m", icon: <EyeIcon /> },
        { title: "Cloud Cover", value: data.cloud ?? "—", unit: "%", icon: <Cloud className="w-4 h-4" /> },
        { title: "UVI", value: data.uvi?.toFixed?.(1) ?? "—", unit: "", icon: <Sun className="w-4 h-4" /> },
    ];

    const tempSeries = history
        .map((h) => ({
            t: new Date(h.t).toLocaleTimeString([], {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
            v: h.temp,
        }))
        .slice(-120);

    const windSeries = history.map((h) => ({ t: h.t, v: h.wind })).slice(-120);
    const precipSeries = history.map((h) => ({ t: h.t, v: h.precip })).slice(-120);

    useEffect(() => {
        let active = true;

        async function init() {
            const loc = await resolveInitialLocation();
            if (active) setLocation(loc);
        }

        init();

        const onPop = async () => {
            const loc = await resolveInitialLocation();
            if (active) setLocation(loc);
        };

        window.addEventListener("popstate", onPop);
        return () => {
            active = false;
            window.removeEventListener("popstate", onPop);
        };
    }, []);

    function makeForecastSendUrl(
        cb: string,
        location: { city: string; lat: number; lon: number }
    ) {
        const info = encodeURIComponent(
            JSON.stringify({
                event: "show-forecast",
                city: location.city,
                latitude: location.lat,
                longitude: location.lon,
            })
        );
        const cbEnc = encodeURIComponent(cb);
        return `https://lehre.bpm.in.tum.de/~ge48tiy/qr/send.php?info=${info}&cb=${cbEnc}`;
    }

    function getCallback() {
        const p = new URLSearchParams(window.location.search);
        return (window.name || p.get("cb") || "").toString();
    }

    function ForecastQrCard({
                                location,
                            }: {
        location: { city: string; lat: number; lon: number } | null;
    }) {
        const cb = getCallback();

        if (!cb) {
            return <div className="text-white/60 text-sm">No CPEE callback.</div>;
        }

        if (!location) {
            return <div className="text-white/60 text-sm">Loading QR...</div>;
        }

        const url = makeForecastSendUrl(cb, location);

        return (
            <div className={clsx("rounded-2xl bg-white/5 border border-white/10", density.card)}>
                <div className="text-sm text-white/80 mb-2">
                    Scan for 7-day forecast of {location.city}
                </div>
                <div className="bg-white p-2 rounded-xl inline-block">
                    <QRCodeCanvas value={url} size={140} />
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen w-full bg-[#0b1020] text-white"
            style={{ fontSize: `${theme.fontScale}rem` }}
        >
            <div className={clsx("absolute inset-0", accent.heroGlow)} />
            <Particles />

            <div className={clsx("relative max-w-7xl mx-auto", density.outer, density.page)}>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-3">
                            <Radio className={clsx("w-5 h-5", accent.badge)} />
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                Real-time Weather Visualization Wall
                            </h1>
                        </div>
                        <div className="mt-1 text-white/60 text-sm">
                            City-level live metrics & trends — powered by Open-Meteo.
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ForecastQrCard location={location} />
                    </div>
                </div>

                <div
                    className={clsx(
                        "rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden bg-gradient-to-br",
                        info.bg,
                        density.hero
                    )}
                >
                    <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
                    <div className="grid md:grid-cols-3 gap-6 items-center">
                        <div className="flex items-center gap-4">
                            <div className="shrink-0 grid place-items-center w-16 h-16 rounded-2xl bg-white/10 border border-white/10">
                                {info.icon}
                            </div>
                            <div>
                                <div className="text-lg text-white/80">{info.label}</div>
                                <div className="text-sm text-white/60">
                                    {location?.city || "Loading location..."}
                                </div>
                                <div className="text-sm text-white/50">
                                    {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : ""}
                                </div>
                                <div className="text-sm text-white/60">
                                    Last update: {formatTime(String(data.ts))}
                                </div>
                                <div className="text-sm text-white/60">
                                    Source: {data.source ?? "—"}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex items-end md:justify-end gap-6">
                            <div className="text-6xl md:text-7xl font-bold leading-none">
                                {data.temp != null ? Math.round(Number(data.temp)) : "—"}
                                <span className="text-3xl align-super">°C</span>
                            </div>
                            <div className="pb-1 space-y-1 text-white/80">
                                <div>
                                    Feels like{" "}
                                    <span className="font-semibold">
                                        {data.feels_like != null ? Math.round(Number(data.feels_like)) : "—"}°C
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Wind className="w-4 h-4" />
                                    <span>{Number(data.wind_speed)?.toFixed?.(1) ?? "—"} m/s</span> ·
                                    <Compass className="w-4 h-4" />
                                    <span>{data.wind_dir ?? "—"}°</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Umbrella className="w-4 h-4" />
                                    <span>{data.precip?.toFixed?.(2) ?? "—"} mm</span> ·
                                    <span>{data.precip_prob ?? "—"}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={clsx("grid md:grid-cols-3 lg:grid-cols-6", density.metricGrid)}>
                    {kpi.map((m) => (
                        <MetricCard
                            key={m.title}
                            title={m.title}
                            value={m.value}
                            unit={m.unit}
                            icon={m.icon}
                            className={density.card}
                        />
                    ))}
                </div>

                <div className={clsx("grid lg:grid-cols-3", density.chartGrid)}>
                    <ChartCard title="Temperature" subtitle="Smoothed live series" className={density.chart}>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={tempSeries} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={accent.line} stopOpacity={0.7} />
                                        <stop offset="95%" stopColor={accent.line} stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="t" tick={{ fill: "#A8B1C7", fontSize: 12 }} tickMargin={8} hide />
                                <YAxis tick={{ fill: "#A8B1C7", fontSize: 12 }} width={32} domain={["auto", "auto"]} />
                                <Tooltip
                                    contentStyle={{
                                        background: "#0b1020",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 12,
                                        color: "#fff",
                                    }}
                                />
                                <Area type="monotone" dataKey="v" stroke={accent.line} fill="url(#gradTemp)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Wind Speed" subtitle="m/s" className={density.chart}>
                        <div className="flex items-center gap-6">
                            <WindCompass dir={Number(data.wind_dir ?? 0)} speed={Number(data.wind_speed ?? 0)} />
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={windSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                        <XAxis dataKey="t" hide />
                                        <YAxis tick={{ fill: "#A8B1C7", fontSize: 12 }} width={30} domain={["auto", "auto"]} />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#0b1020",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 12,
                                                color: "#fff",
                                            }}
                                        />
                                        <Line type="monotone" dataKey="v" stroke={accent.line2} dot={false} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </ChartCard>

                    <ChartCard title="Precipitation" subtitle="mm (live)" className={density.chart}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={precipSeries} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="t" hide />
                                <YAxis tick={{ fill: "#A8B1C7", fontSize: 12 }} width={30} domain={[0, "auto"]} />
                                <Tooltip
                                    contentStyle={{
                                        background: "#0b1020",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 12,
                                        color: "#fff",
                                    }}
                                />
                                <Bar dataKey="v" fill={accent.bar} radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs text-white/50">
                    <div className="flex items-center gap-3">
                        <span>Theme: {theme.accent}</span>
                        <span>Font: {theme.fontScale}</span>
                        <span>Density: {theme.density}</span>
                        <span>
                            Status:{" "}
                            <span
                                className={clsx(
                                    status === "connected" && "text-emerald-300",
                                    status === "connecting" && "text-yellow-200",
                                    status === "mock" && "text-sky-300",
                                    status === "error" && "text-rose-300"
                                )}
                            >
                                {status}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChartCard({
                       title,
                       subtitle,
                       children,
                       className,
                   }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={clsx("rounded-2xl border border-white/10 bg-white/5 backdrop-blur", className)}>
            <div className="mb-2">
                <div className="text-white/80 font-semibold">{title}</div>
                {subtitle && <div className="text-xs text-white/50">{subtitle}</div>}
            </div>
            {children}
        </div>
    );
}

function EyeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}