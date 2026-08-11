const BASE = {
  name: "Doğan Lastik Servisi İskele",
  lat: 35.2867,
  lon: 33.8917,
  mapsUrl: "https://share.google/n99oqM8SvduZ4cH71",
};

const REGIONS = [
  { id: "iskele", name: "İskele (Merkez)", lat: 35.2867, lon: 33.8917, fallbackMin: 12 },
  { id: "bogaz", name: "Boğaz / Long Beach", lat: 35.326, lon: 33.925, fallbackMin: 18 },
  { id: "mehmetcik", name: "Mehmetçik", lat: 35.408, lon: 34.07, fallbackMin: 28 },
  { id: "yenierenkoy", name: "Yenierenköy", lat: 35.533, lon: 34.19, fallbackMin: 38 },
  { id: "dipkarpaz", name: "Dipkarpaz / Karpaz", lat: 35.638, lon: 34.407, fallbackMin: 48 },
  { id: "magusa", name: "Gazimağusa", lat: 35.125, lon: 33.94, fallbackMin: 30 },
  { id: "salamis", name: "Salamis / Maraş", lat: 35.16, lon: 33.91, fallbackMin: 26 },
  { id: "lefkosa", name: "Lefkoşa", lat: 35.185, lon: 33.382, fallbackMin: 55 },
  { id: "girne", name: "Girne", lat: 35.337, lon: 33.319, fallbackMin: 65 },
  { id: "alsancak", name: "Alsancak", lat: 35.34, lon: 33.2, fallbackMin: 75 },
  { id: "guzelyurt", name: "Güzelyurt", lat: 35.198, lon: 32.994, fallbackMin: 85 },
  { id: "lefke", name: "Lefke", lat: 35.114, lon: 32.849, fallbackMin: 95 },
];

let customDest = null;
let pickMap = null;
let pickMarker = null;

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const I = () => window.DLS_I18N;
const t = (k, v) => (I() ? I().t(k, v) : k);

const regionSelect = document.getElementById("region");
const calcBtn = document.getElementById("calc-btn");
const result = document.getElementById("eta-result");
const etaMinutes = document.getElementById("eta-minutes");
const etaMsg = document.getElementById("eta-msg");
const etaDistance = document.getElementById("eta-distance");
const etaClock = document.getElementById("eta-clock");
const mapsBtn = document.getElementById("maps-btn");
const hint = document.getElementById("eta-hint");
const locStatus = document.getElementById("loc-status");
const mapWrap = document.getElementById("pick-map-wrap");
const gpsBtn = document.getElementById("gps-btn");
const pinBtn = document.getElementById("pin-btn");
const langSwitch = document.getElementById("lang-switch");

function fillRegions() {
  if (!regionSelect) return;
  const current = regionSelect.value;
  regionSelect.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.disabled = true;
  ph.selected = !current;
  ph.setAttribute("data-i18n-placeholder", "region_placeholder");
  ph.textContent = t("region_placeholder");
  regionSelect.appendChild(ph);
  REGIONS.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    if (r.id === current) opt.selected = true;
    regionSelect.appendChild(opt);
  });
}

fillRegions();

function mapsDirectionsUrl(dest) {
  const origin = `${BASE.lat},${BASE.lon}`;
  const destination = `${dest.lat},${dest.lon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

function arrivalClock(minutes) {
  const lang = I()?.lang || "tr";
  const d = new Date(Date.now() + minutes * 60 * 1000);
  return d.toLocaleTimeString(lang === "tr" ? "tr-TR" : lang, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function haversineKm(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fallbackMinutes(dest) {
  if (dest.fallbackMin) return dest.fallbackMin;
  const km = haversineKm(BASE, dest) * 1.35;
  return Math.max(10, Math.round((km / 55) * 60));
}

async function routeEta(dest) {
  const url = `https://router.project-osrm.org/route/v1/driving/${BASE.lon},${BASE.lat};${dest.lon},${dest.lat}?overview=false&alternatives=false`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("osrm");
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error("no-route");
    return {
      minutes: Math.max(8, Math.round(route.duration / 60)),
      km: route.distance / 1000,
      source: "osrm",
    };
  } catch {
    const km = haversineKm(BASE, dest) * 1.35;
    return { minutes: fallbackMinutes(dest), km, source: "fallback" };
  } finally {
    clearTimeout(timer);
  }
}

function waLinks(dest) {
  const text = `${t("wa_text")} ${dest.lat.toFixed(5)},${dest.lon.toFixed(5)} https://maps.google.com/?q=${dest.lat},${dest.lon}`;
  const q = encodeURIComponent(text);
  document.querySelectorAll("a.btn-wa, a.header-wa, a.wa-float").forEach((a) => {
    const base = a.href.includes("905488409810") ? "905488409810" : "905338719810";
    a.href = `https://wa.me/${base}?text=${q}`;
  });
}

function renderEta(dest, eta) {
  const mins = eta.minutes;
  const time = arrivalClock(mins);
  etaMinutes.textContent = String(mins);
  etaMsg.textContent = t("eta_msg", { name: dest.name, time });
  etaDistance.textContent = t("distance", { km: eta.km.toFixed(1) });
  etaClock.textContent = t("arrival", { time });
  mapsBtn.href = mapsDirectionsUrl(dest);
  mapsBtn.title = `${BASE.name} → ${dest.name}`;
  result.hidden = false;
  hint.textContent = eta.source === "osrm" ? t("hint_osrm") : t("hint_fallback");
  waLinks(dest);
}

function currentDest() {
  if (customDest) return customDest;
  const id = regionSelect.value;
  return REGIONS.find((r) => r.id === id) || null;
}

async function calculate() {
  const dest = currentDest();
  if (!dest) {
    if (locStatus) locStatus.textContent = t("need_loc");
    regionSelect.focus();
    return;
  }
  calcBtn.disabled = true;
  calcBtn.textContent = t("calculating");
  const eta = await routeEta(dest);
  renderEta(dest, eta);
  calcBtn.disabled = false;
  calcBtn.textContent = t("calc");
}

function setCustomDest(lat, lon, nameKey) {
  customDest = {
    id: "custom",
    name: t(nameKey),
    lat,
    lon,
  };
  if (regionSelect) regionSelect.value = "";
  if (locStatus) locStatus.textContent = `${t(nameKey)} · ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  if (pickMarker && pickMap) {
    pickMarker.setLatLng([lat, lon]);
  }
  calculate();
}

function ensureMap() {
  if (pickMap || typeof L === "undefined") return;
  mapWrap.hidden = false;
  pickMap = L.map("pick-map", { zoomControl: true }).setView([BASE.lat, BASE.lon], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(pickMap);
  pickMarker = L.marker([BASE.lat, BASE.lon], { draggable: true }).addTo(pickMap);
  pickMap.on("click", (e) => {
    setCustomDest(e.latlng.lat, e.latlng.lng, "custom_pin");
  });
  pickMarker.on("dragend", () => {
    const p = pickMarker.getLatLng();
    setCustomDest(p.lat, p.lng, "custom_pin");
  });
  setTimeout(() => pickMap.invalidateSize(), 80);
}

gpsBtn?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locStatus.textContent = t("gps_fail");
    ensureMap();
    return;
  }
  locStatus.textContent = t("calculating");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      ensureMap();
      const { latitude, longitude } = pos.coords;
      pickMap.setView([latitude, longitude], 13);
      setCustomDest(latitude, longitude, "my_location");
      locStatus.textContent = t("gps_ok");
    },
    () => {
      locStatus.textContent = t("gps_fail");
      ensureMap();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

pinBtn?.addEventListener("click", () => {
  ensureMap();
  mapWrap.hidden = false;
  locStatus.textContent = t("map_hint");
  setTimeout(() => pickMap?.invalidateSize(), 100);
});

calcBtn.addEventListener("click", calculate);
regionSelect.addEventListener("change", () => {
  if (!regionSelect.value) return;
  customDest = null;
  calculate();
});

langSwitch?.addEventListener("change", () => {
  I()?.setLang(langSwitch.value);
  fillRegions();
  calcBtn.textContent = t("calc");
  if (!result.hidden && currentDest()) calculate();
  else if (hint) hint.textContent = t("hint_default");
});

document.addEventListener("dls:lang", () => {
  fillRegions();
  if (calcBtn) calcBtn.textContent = t("calc");
});

if (I()) I().init();
if (hint) hint.textContent = t("hint_default");

const items = document.querySelectorAll(".service-item, .why-card");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );
  items.forEach((el, i) => {
    el.style.setProperty("--i", String(i));
    io.observe(el);
  });
} else {
  items.forEach((el) => el.classList.add("is-in"));
}
