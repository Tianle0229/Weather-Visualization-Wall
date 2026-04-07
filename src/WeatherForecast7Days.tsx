import React, { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Wind, Thermometer } from "lucide-react";

type LocationState = {
    city: string;
    lat: number;
    lon: number;
};

type ForecastDay = {
    date: string;
    weather_code: number;
    temp_max: number;
    temp_min: number;
    precipitation_sum: number;
    wind_speed_max: number;
};

function parseRawPageParams() {
    const p = new URLSearchParams(window.location.search);

    const city = (p.get("city") || "").toString().trim();

    const latRaw = p.get("lat") || p.get("latitude");
    const lonRaw = p.get("lon") || p.get("longitude");

    const lat =
        latRaw !== null && latRaw !== "" && !Number.isNaN(Number(latRaw))
            ? Number(latRaw)
            : undefined;

    const lon =
        lonRaw !== null && lonRaw !== "" && !Number.isNaN(Number(lonRaw))
            ? Number(lonRaw)
            : undefined;

    return { city, lat, lon };
}

async function geocodeCity(city: string): Promise<LocationState | null> {
    const q = city.trim();
    if (!q) return null;

    const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Geocoding HTTP ${res.status}`);
    }

    const j = await res.json();
    const first = j?.results?.[0];

    if (!first) return null;

    return {
        city: first.name || city,
        lat: Number(first.latitude),
        lon: Number(first.longitude),
    };
}

async function resolveLocation(): Promise<LocationState> {
    const { city, lat, lon } = parseRawPageParams();

    // 1. Latitude and longitude first
    if (typeof lat === "number" && typeof lon === "number") {
        return {
            city: city || `Lat ${lat}, Lon ${lon}`,
            lat,
            lon,
        };
    }

    // 2. If only the city is provided, geocode it to obtain the latitude and longitude
    if (city) {
        const geo = await geocodeCity(city);
        if (geo) return geo;
    }

    // 3. fallback
    return {
        city: "Munich",
        lat: 48.137,
        lon: 11.575,
    };
}

function codeToLabel(code?: number) {
    if (code == null) {
        return { label: "Unknown", icon: <Cloud className="w-5 h-5" /> };
    }

    if (code === 0) {
        return { label: "Clear sky", icon: <Sun className="w-5 h-5" /> };
    }

    if ([1, 2, 3].includes(code)) {
        return { label: "Cloudy", icon: <Cloud className="w-5 h-5" /> };
    }

    if ([45, 48].includes(code)) {
        return { label: "Fog", icon: <Cloud className="w-5 h-5" /> };
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
        return { label: "Drizzle", icon: <CloudRain className="w-5 h-5" /> };
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return { label: "Rain", icon: <CloudRain className="w-5 h-5" /> };
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return { label: "Snow", icon: <Cloud className="w-5 h-5" /> };
    }

    if ([95, 96, 99].includes(code)) {
        return { label: "Thunderstorm", icon: <CloudRain className="w-5 h-5" /> };
    }

    return { label: `Code ${code}`, icon: <Cloud className="w-5 h-5" /> };
}

export default function WeatherForecast7Days() {
    const [location, setLocation] = useState<LocationState | null>(null);
    const [days, setDays] = useState<ForecastDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function init() {
            try {
                const loc = await resolveLocation();
                if (active) {
                    setLocation(loc);
                }
            } catch (e) {
                console.warn("resolveLocation error", e);
                if (active) {
                    setLocation({
                        city: "Munich",
                        lat: 48.137,
                        lon: 11.575,
                    });
                }
            }
        }

        init();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!location) return;

        const currentLocation = location;

        async function loadForecast() {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    latitude: String(currentLocation.lat),
                    longitude: String(currentLocation.lon),
                    daily:
                        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                    forecast_days: "7",
                    timezone: "auto",
                });

                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const j = await res.json();
                const daily = j.daily;

                const mapped: ForecastDay[] = daily.time.map((date: string, i: number) => ({
                    date,
                    weather_code: daily.weather_code[i],
                    temp_max: daily.temperature_2m_max[i],
                    temp_min: daily.temperature_2m_min[i],
                    precipitation_sum: daily.precipitation_sum[i],
                    wind_speed_max: daily.wind_speed_10m_max[i],
                }));

                setDays(mapped);
            } catch (e) {
                console.warn("forecast fetch error", e);
            } finally {
                setLoading(false);
            }
        }

        loadForecast();
    }, [location]);

    return (
        <div className="min-h-screen bg-[#0b1020] text-white px-6 py-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">7-Day Weather Forecast</h1>
                        <div className="text-white/60 mt-1">
                            {location
                                ? `${location.city} · ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                                : "Loading..."}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-white/60">Loading forecast...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {days.map((d) => {
                            const info = codeToLabel(d.weather_code);
                            return (
                                <div
                                    key={d.date}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="font-semibold">{d.date}</div>
                                        <div className="text-white/80">{info.icon}</div>
                                    </div>

                                    <div className="text-white/70 text-sm mb-4">{info.label}</div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Thermometer className="w-4 h-4" />
                                            <span>
                                                Max {Math.round(d.temp_max)}°C / Min {Math.round(d.temp_min)}°C
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CloudRain className="w-4 h-4" />
                                            <span>{d.precipitation_sum.toFixed(1)} mm</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Wind className="w-4 h-4" />
                                            <span>{d.wind_speed_max.toFixed(1)} km/h</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}