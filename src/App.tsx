import React from "react";
import WeatherWall from "./WeatherWall";
import WeatherForecast7Days from "./WeatherForecast7Days";

function getView() {
    const p = new URLSearchParams(window.location.search);
    return p.get("view") || "main";
}

export default function App() {
    const view = getView();

    if (view === "forecast") {
        return <WeatherForecast7Days />;
    }

    return <WeatherWall />;
}