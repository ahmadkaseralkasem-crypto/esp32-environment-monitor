const SVG_NS = "http://www.w3.org/2000/svg";

const elements = {
    connectionStatus: document.getElementById("connection-status"),
    connectionLabel: document.getElementById("connection-label"),
    currentDate: document.getElementById("current-date"),
    refreshButton: document.getElementById("refresh-button"),
    themeToggle: document.getElementById("theme-toggle"),
    temperature: document.getElementById("current-temperature"),
    temperatureTime: document.getElementById("temperature-time"),
    temperatureTrend: document.getElementById("temperature-trend"),
    humidity: document.getElementById("current-humidity"),
    humidityGauge: document.getElementById("humidity-gauge"),
    humidityDescription: document.getElementById("humidity-description"),
    humidityTrend: document.getElementById("humidity-trend"),
    highTemperature: document.getElementById("high-temperature"),
    lowTemperature: document.getElementById("low-temperature"),
    averageHumidity: document.getElementById("average-humidity"),
    readingCount: document.getElementById("reading-count"),
    rangeSelect: document.getElementById("range-select"),
    chart: document.getElementById("weather-chart"),
    chartDescription: document.getElementById("chart-description"),
    chartTooltip: document.getElementById("chart-tooltip"),
    sourceBadge: document.getElementById("source-badge"),
    storageStep: document.getElementById("storage-step"),
    storageName: document.getElementById("storage-name"),
    storageDescription: document.getElementById("storage-description"),
    lastObservation: document.getElementById("last-observation"),
    readingsBody: document.getElementById("readings-body"),
    errorToast: document.getElementById("error-toast"),
    errorMessage: document.getElementById("error-message"),
};

const state = {
    readings: [],
    storageBackend: "unknown",
};

function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, String(value));
    }
    return element;
}

function formatNumber(value, digits = 1) {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    }).format(value);
}

function formatObservedAt(value, options = {}) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }
    return new Intl.DateTimeFormat(undefined, options).format(date);
}

function relativeTime(value) {
    const milliseconds = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) {
        return "Unknown time";
    }

    const minutes = Math.round(milliseconds / 60000);
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    if (Math.abs(minutes) < 60) {
        return formatter.format(-minutes, "minute");
    }
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) {
        return formatter.format(-hours, "hour");
    }
    return formatter.format(-Math.round(hours / 24), "day");
}

function humidityLabel(value) {
    if (value < 30) return "Dry air";
    if (value <= 60) return "Comfortable";
    if (value <= 75) return "Humid air";
    return "Very humid";
}

function setConnection(mode, label) {
    elements.connectionStatus.classList.remove("is-online", "is-error");
    if (mode) {
        elements.connectionStatus.classList.add(mode);
    }
    elements.connectionLabel.textContent = label;
}

function normalizeReadings(records) {
    if (!Array.isArray(records)) return [];
    return records
        .map((record) => ({
            ...record,
            temperature_c: Number(record.temperature_c),
            humidity_percent: Number(record.humidity_percent),
            observedDate: new Date(record.timestamp),
        }))
        .filter((record) => (
            Number.isFinite(record.temperature_c)
            && Number.isFinite(record.humidity_percent)
            && !Number.isNaN(record.observedDate.getTime())
        ))
        .sort((a, b) => b.observedDate - a.observedDate);
}

async function loadDashboard() {
    elements.refreshButton.classList.add("is-loading");
    elements.refreshButton.disabled = true;
    elements.errorToast.hidden = true;
    setConnection("", "Updating");

    try {
        const [readingsResponse, healthResponse] = await Promise.all([
            fetch("/api/readings?limit=96", { cache: "no-store" }),
            fetch("/health", { cache: "no-store" }),
        ]);

        if (!readingsResponse.ok) {
            throw new Error(`Readings request returned ${readingsResponse.status}`);
        }

        state.readings = normalizeReadings(await readingsResponse.json());
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            state.storageBackend = String(health.storage_backend || "unknown");
        }

        renderDashboard();
        setConnection("is-online", "Live data");
    } catch (error) {
        setConnection("is-error", "Disconnected");
        elements.errorMessage.textContent = error instanceof Error ? error.message : "Check that the middleware is running.";
        elements.errorToast.hidden = false;
        renderEmptyState();
    } finally {
        elements.refreshButton.classList.remove("is-loading");
        elements.refreshButton.disabled = false;
    }
}

function renderDashboard() {
    renderStorage();
    if (state.readings.length === 0) {
        renderEmptyState();
        return;
    }

    const current = state.readings[0];
    const previous = state.readings[1];
    const lastDayBoundary = Date.now() - (24 * 60 * 60 * 1000);
    const lastDay = state.readings.filter((reading) => reading.observedDate.getTime() >= lastDayBoundary);
    const summaryReadings = lastDay.length > 0 ? lastDay : state.readings;

    elements.temperature.textContent = formatNumber(current.temperature_c);
    elements.temperatureTime.textContent = `Observed ${relativeTime(current.timestamp)}`;
    elements.humidity.textContent = formatNumber(current.humidity_percent, 0);
    elements.humidityGauge.style.setProperty("--gauge-value", String(Math.min(100, Math.max(0, current.humidity_percent))));
    elements.humidityGauge.setAttribute("aria-label", `Humidity ${formatNumber(current.humidity_percent, 0)} percent`);
    elements.humidityDescription.textContent = humidityLabel(current.humidity_percent);
    elements.sourceBadge.textContent = String(current.source || "unknown").replaceAll("-", " ");
    elements.lastObservation.textContent = formatObservedAt(current.timestamp, {
        dateStyle: "medium",
        timeStyle: "short",
    });

    renderTrend(elements.temperatureTrend, current.temperature_c, previous?.temperature_c, "°C");
    renderTrend(elements.humidityTrend, current.humidity_percent, previous?.humidity_percent, "%");

    const temperatures = summaryReadings.map((reading) => reading.temperature_c);
    const humidities = summaryReadings.map((reading) => reading.humidity_percent);
    elements.highTemperature.textContent = `${formatNumber(Math.max(...temperatures))} °C`;
    elements.lowTemperature.textContent = `${formatNumber(Math.min(...temperatures))} °C`;
    elements.averageHumidity.textContent = `${formatNumber(average(humidities), 0)} %`;
    elements.readingCount.textContent = String(summaryReadings.length);

    renderChart();
    renderTable();
}

function renderStorage() {
    const backend = state.storageBackend === "supabase" ? "Supabase cloud" : "SQLite database";
    elements.storageName.textContent = backend;
    elements.storageDescription.textContent = "Connected and ready";
    elements.storageStep.classList.add("is-active");
}

function renderTrend(element, current, previous, unit) {
    element.classList.remove("is-up", "is-down");
    if (!Number.isFinite(previous)) {
        element.textContent = "First reading in this view";
        return;
    }

    const difference = current - previous;
    if (Math.abs(difference) < 0.05) {
        element.textContent = "No change from previous reading";
        return;
    }

    const direction = difference > 0 ? "↑" : "↓";
    element.classList.add(difference > 0 ? "is-up" : "is-down");
    element.textContent = `${direction} ${formatNumber(Math.abs(difference))}${unit} from previous reading`;
}

function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderEmptyState() {
    elements.temperature.textContent = "--";
    elements.temperatureTime.textContent = "Run the collector to add data";
    elements.temperatureTrend.textContent = "No trend available";
    elements.humidity.textContent = "--";
    elements.humidityGauge.style.setProperty("--gauge-value", "0");
    elements.humidityGauge.setAttribute("aria-label", "Humidity unavailable");
    elements.humidityDescription.textContent = "Waiting for data";
    elements.humidityTrend.textContent = "No trend available";
    elements.highTemperature.textContent = "-- °C";
    elements.lowTemperature.textContent = "-- °C";
    elements.averageHumidity.textContent = "-- %";
    elements.readingCount.textContent = "0";
    elements.sourceBadge.textContent = "No source";
    elements.lastObservation.textContent = "No data yet";
    renderChart();
    renderTable();
}

function extent(values, paddingRatio = 0.12) {
    let minimum = Math.min(...values);
    let maximum = Math.max(...values);
    if (minimum === maximum) {
        minimum -= 1;
        maximum += 1;
    }
    const padding = (maximum - minimum) * paddingRatio;
    return [minimum - padding, maximum + padding];
}

function createScale(domainMinimum, domainMaximum, rangeMinimum, rangeMaximum) {
    return (value) => rangeMinimum + ((value - domainMinimum) / (domainMaximum - domainMinimum)) * (rangeMaximum - rangeMinimum);
}

function linePath(readings, xScale, yScale, key) {
    return readings.map((reading, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command}${xScale(reading.observedDate.getTime()).toFixed(2)},${yScale(reading[key]).toFixed(2)}`;
    }).join(" ");
}

function renderChart() {
    const limit = Number(elements.rangeSelect.value);
    const readings = state.readings.slice(0, limit).reverse();
    elements.chart.replaceChildren();

    const width = Math.max(280, Math.round(elements.chart.parentElement.clientWidth));
    const height = 330;
    elements.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);

    if (readings.length === 0) {
        const empty = svgElement("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "chart-empty" });
        empty.textContent = "No readings yet — run the collector to begin";
        elements.chart.append(empty);
        elements.chartDescription.textContent = "No weather readings are available.";
        return;
    }

    const narrowChart = width < 500;
    const margin = {
        top: 24,
        right: narrowChart ? 42 : 54,
        bottom: 48,
        left: narrowChart ? 42 : 54,
    };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const timestamps = readings.map((reading) => reading.observedDate.getTime());
    const [temperatureMinimum, temperatureMaximum] = extent(readings.map((reading) => reading.temperature_c));
    const [humidityMinimum, humidityMaximum] = extent(readings.map((reading) => reading.humidity_percent));
    const timestampMinimum = Math.min(...timestamps);
    const timestampMaximum = Math.max(...timestamps);
    const safeTimestampMaximum = timestampMinimum === timestampMaximum ? timestampMaximum + 1 : timestampMaximum;
    const xScale = createScale(timestampMinimum, safeTimestampMaximum, margin.left, margin.left + plotWidth);
    const temperatureScale = createScale(temperatureMinimum, temperatureMaximum, margin.top + plotHeight, margin.top);
    const humidityScale = createScale(humidityMinimum, humidityMaximum, margin.top + plotHeight, margin.top);

    const definitions = svgElement("defs");
    const gradient = svgElement("linearGradient", { id: "temperature-gradient", x1: 0, y1: 0, x2: 0, y2: 1 });
    gradient.append(
        svgElement("stop", { offset: "0%", "stop-color": "var(--temperature)", "stop-opacity": "0.2" }),
        svgElement("stop", { offset: "100%", "stop-color": "var(--temperature)", "stop-opacity": "0" }),
    );
    definitions.append(gradient);
    elements.chart.append(definitions);

    for (let index = 0; index <= 4; index += 1) {
        const ratio = index / 4;
        const y = margin.top + (plotHeight * ratio);
        const temperatureValue = temperatureMaximum - ((temperatureMaximum - temperatureMinimum) * ratio);
        const humidityValue = humidityMaximum - ((humidityMaximum - humidityMinimum) * ratio);
        elements.chart.append(svgElement("line", {
            x1: margin.left,
            y1: y,
            x2: margin.left + plotWidth,
            y2: y,
            class: "chart-grid",
        }));

        const temperatureLabel = svgElement("text", {
            x: margin.left - 10,
            y: y + 4,
            "text-anchor": "end",
            class: "chart-axis-label",
        });
        temperatureLabel.textContent = `${formatNumber(temperatureValue, 0)}°`;

        const humidityLabelText = svgElement("text", {
            x: margin.left + plotWidth + 10,
            y: y + 4,
            "text-anchor": "start",
            class: "chart-axis-label",
        });
        humidityLabelText.textContent = `${formatNumber(humidityValue, 0)}%`;
        elements.chart.append(temperatureLabel, humidityLabelText);
    }

    const tickCount = Math.min(narrowChart ? 3 : 5, readings.length);
    for (let index = 0; index < tickCount; index += 1) {
        const readingIndex = tickCount === 1 ? 0 : Math.round(index * (readings.length - 1) / (tickCount - 1));
        const reading = readings[readingIndex];
        const label = svgElement("text", {
            x: xScale(reading.observedDate.getTime()),
            y: height - 15,
            "text-anchor": index === 0 ? "start" : index === tickCount - 1 ? "end" : "middle",
            class: "chart-axis-label",
        });
        label.textContent = formatObservedAt(reading.timestamp, { hour: "2-digit", minute: "2-digit" });
        elements.chart.append(label);
    }

    const temperaturePath = linePath(readings, xScale, temperatureScale, "temperature_c");
    const areaPath = `${temperaturePath} L${xScale(timestamps[timestamps.length - 1]).toFixed(2)},${(margin.top + plotHeight).toFixed(2)} L${xScale(timestamps[0]).toFixed(2)},${(margin.top + plotHeight).toFixed(2)} Z`;
    elements.chart.append(
        svgElement("path", { d: areaPath, class: "temperature-area" }),
        svgElement("path", { d: temperaturePath, class: "temperature-line" }),
        svgElement("path", { d: linePath(readings, xScale, humidityScale, "humidity_percent"), class: "humidity-line" }),
    );

    readings.forEach((reading) => {
        const x = xScale(reading.observedDate.getTime());
        elements.chart.append(
            svgElement("circle", { cx: x, cy: temperatureScale(reading.temperature_c), r: 4, class: "chart-point temperature-point" }),
            svgElement("circle", { cx: x, cy: humidityScale(reading.humidity_percent), r: 4, class: "chart-point humidity-point" }),
        );

        const hitTarget = svgElement("rect", {
            x: Math.max(margin.left, x - 14),
            y: margin.top,
            width: 28,
            height: plotHeight,
            class: "chart-hit",
        });
        hitTarget.addEventListener("pointerenter", (event) => showChartTooltip(event, reading, x, margin.top, plotHeight));
        hitTarget.addEventListener("pointermove", (event) => positionTooltip(event));
        hitTarget.addEventListener("pointerleave", hideChartTooltip);
        elements.chart.append(hitTarget);
    });

    elements.chartDescription.textContent = `${readings.length} readings. Latest temperature ${formatNumber(readings.at(-1).temperature_c)} degrees Celsius and humidity ${formatNumber(readings.at(-1).humidity_percent, 0)} percent.`;
}

function showChartTooltip(event, reading, x, top, height) {
    const guide = svgElement("line", {
        id: "chart-guide",
        x1: x,
        y1: top,
        x2: x,
        y2: top + height,
        class: "chart-guide",
    });
    document.getElementById("chart-guide")?.remove();
    elements.chart.append(guide);

    elements.chartTooltip.replaceChildren();
    const time = document.createElement("strong");
    time.textContent = formatObservedAt(reading.timestamp, { dateStyle: "medium", timeStyle: "short" });
    const values = document.createElement("span");
    values.textContent = `${formatNumber(reading.temperature_c)} °C · ${formatNumber(reading.humidity_percent, 0)}% humidity`;
    elements.chartTooltip.append(time, values);
    elements.chartTooltip.hidden = false;
    positionTooltip(event);
}

function positionTooltip(event) {
    const chartBounds = elements.chart.getBoundingClientRect();
    const wrapBounds = elements.chart.parentElement.getBoundingClientRect();
    const tooltipWidth = elements.chartTooltip.offsetWidth;
    const localX = event.clientX - wrapBounds.left;
    const localY = event.clientY - wrapBounds.top;
    const left = Math.min(Math.max(8, localX + 14), chartBounds.width - tooltipWidth - 8);
    elements.chartTooltip.style.left = `${left}px`;
    elements.chartTooltip.style.top = `${Math.max(8, localY - 64)}px`;
}

function hideChartTooltip() {
    elements.chartTooltip.hidden = true;
    document.getElementById("chart-guide")?.remove();
}

function renderTable() {
    elements.readingsBody.replaceChildren();
    if (state.readings.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.className = "empty-table";
        cell.textContent = "No readings yet. Run python collect_weather.py in a second terminal.";
        row.append(cell);
        elements.readingsBody.append(row);
        return;
    }

    state.readings.slice(0, 8).forEach((reading) => {
        const row = document.createElement("tr");
        const observed = document.createElement("td");
        observed.textContent = formatObservedAt(reading.timestamp, { dateStyle: "medium", timeStyle: "short" });

        const temperature = document.createElement("td");
        temperature.className = "table-temperature";
        temperature.textContent = `${formatNumber(reading.temperature_c)} °C`;

        const humidity = document.createElement("td");
        humidity.className = "table-humidity";
        humidity.textContent = `${formatNumber(reading.humidity_percent, 0)} %`;

        const source = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "table-source";
        badge.textContent = String(reading.source || "unknown").replaceAll("-", " ");
        source.append(badge);

        row.append(observed, temperature, humidity, source);
        elements.readingsBody.append(row);
    });
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    elements.themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    elements.themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
    localStorage.setItem("weather-theme", theme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("weather-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        return;
    }
    setTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}

elements.currentDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
}).format(new Date());

elements.refreshButton.addEventListener("click", loadDashboard);
elements.rangeSelect.addEventListener("change", renderChart);
elements.themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});

let resizeTimer;
window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderChart, 120);
});

initializeTheme();
loadDashboard();
window.setInterval(loadDashboard, 60_000);
