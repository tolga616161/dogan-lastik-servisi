const PHONE = "+905551234567";
const BASE = {
  name: "İskele",
  lat: 35.2867,
  lon: 33.8917,
};

/** Kuzey Kıbrıs bölgeler — İskele üssünden */
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

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const regionSelect = document.getElementById("region");
const calcBtn = document.getElementById("calc-btn");
const result = document.getElementById("eta-result");
const etaMinutes = document.getElementById("eta-minutes");
const etaMsg = document.getElementById("eta-msg");
const etaDistance = document.getElementById("eta-distance");
const etaClock = document.getElementById("eta-clock");
const mapsBtn = document.getElementById("maps-btn");
const hint = document.getElementById("eta-hint");

REGIONS.forEach((r) => {
  const opt = document.createElement("option");
  opt.value = r.id;
  opt.textContent = r.name;
  regionSelect.appendChild(opt);
});

function mapsDirectionsUrl(dest) {
  const origin = `${BASE.lat},${BASE.lon}`;
  const destination = `${dest.lat},${dest.lon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

function arrivalClock(minutes) {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
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
    return {
      minutes: dest.fallbackMin,
      km,
      source: "fallback",
    };
  } finally {
    clearTimeout(timer);
  }
}

function renderEta(region, eta) {
  const mins = eta.minutes;
  etaMinutes.textContent = String(mins);
  etaMsg.textContent = `${region.name} bölgesindesiniz — bu saatte ararsanız yaklaşık ${arrivalClock(mins)} civarı yanınızda oluruz.`;
  etaDistance.textContent = `Mesafe ≈ ${eta.km.toFixed(1)} km`;
  etaClock.textContent = `Tahmini varış ≈ ${arrivalClock(mins)}`;
  mapsBtn.href = mapsDirectionsUrl(region);
  result.hidden = false;
  hint.textContent =
    eta.source === "osrm"
      ? "Süre, açık yol verisine göre hesaplandı (Google Maps’e yakın)."
      : "Ağ gecikmesinde yedek süre kullanıldı — Google Maps ile doğrulayabilirsiniz.";
}

async function calculate() {
  const id = regionSelect.value;
  const region = REGIONS.find((r) => r.id === id);
  if (!region) {
    regionSelect.focus();
    return;
  }
  calcBtn.disabled = true;
  calcBtn.textContent = "Hesaplanıyor…";
  const eta = await routeEta(region);
  renderEta(region, eta);
  calcBtn.disabled = false;
  calcBtn.textContent = "Süreyi Göster";
}

calcBtn.addEventListener("click", calculate);
regionSelect.addEventListener("change", () => {
  if (regionSelect.value) calculate();
});

const items = document.querySelectorAll(".service-item");
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
