// Yenilemede tarayıcı eski scroll / #markalar yerine üste alsın
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
} catch (_) {
  /* ignore */
}
window.scrollTo(0, 0);
window.addEventListener("load", () => {
  // hash ile gelinse bile ilk açılışta üste al
  if (!sessionStorage.getItem("dls_nav")) {
    window.scrollTo(0, 0);
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  sessionStorage.removeItem("dls_nav");
});
document.addEventListener(
  "click",
  (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (a) sessionStorage.setItem("dls_nav", "1");
  },
  true
);

const BASE = {
  name: "Doğan Lastik Servisi İskele",
  lat: 35.2867,
  lon: 33.8917,
  mapsUrl: "https://share.google/n99oqM8SvduZ4cH71",
};

const WA_LINE_1 = "905338719810";
const WA_LINE_2 = "905488409810";
const WA_NUMBERS = [WA_LINE_1, WA_LINE_2];

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
let lastEta = null;

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
const form = document.getElementById("talep");
const fPhone = document.getElementById("f-phone");
const fSize = document.getElementById("f-size");
const fLoc = document.getElementById("f-loc");
const fDesc = document.getElementById("f-desc");
const formStatus = document.getElementById("form-status");

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

function mapsPinUrl(dest) {
  return `https://maps.google.com/?q=${dest.lat},${dest.lon}`;
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

function localEta(dest) {
  const km = haversineKm(BASE, dest) * 1.35;
  return { minutes: fallbackMinutes(dest), km, source: "fallback" };
}

async function routeEta(dest) {
  const url = `https://router.project-osrm.org/route/v1/driving/${BASE.lon},${BASE.lat};${dest.lon},${dest.lat}?overview=false&alternatives=false`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors" });
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
    return localEta(dest);
  } finally {
    clearTimeout(timer);
  }
}

function syncLocationField(dest) {
  if (!fLoc || !dest) return;
  // Konum seçilince alttaki kutuyu anında doldur
  const label = dest.name || t("custom_pin");
  fLoc.value = label;
  fLoc.classList.add("is-filled");
  fLoc.setAttribute("title", `${label} (${dest.lat.toFixed(5)}, ${dest.lon.toFixed(5)})`);
}

function renderEta(dest, eta) {
  if (!dest || !eta || !result) return;
  const mins = eta.minutes;
  const time = arrivalClock(mins);
  lastEta = eta;
  if (etaMinutes) etaMinutes.textContent = String(mins);
  if (etaMsg) etaMsg.textContent = t("eta_msg", { name: dest.name, time });
  if (etaDistance) etaDistance.textContent = t("distance", { km: eta.km.toFixed(1) });
  if (etaClock) etaClock.textContent = t("arrival", { time });
  if (mapsBtn) {
    mapsBtn.href = mapsDirectionsUrl(dest);
    mapsBtn.title = `${BASE.name} → ${dest.name}`;
  }
  result.hidden = false;
  result.removeAttribute("hidden");
  result.style.display = "";
  if (hint) hint.textContent = eta.source === "osrm" ? t("hint_osrm") : t("hint_fallback");
  syncLocationField(dest);
  if (formStatus) formStatus.textContent = t("form_note");
  if (renderEta.shouldScroll) {
    try {
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (_) {
      /* ignore */
    }
    renderEta.shouldScroll = false;
  }
}
renderEta.shouldScroll = false;

function currentDest() {
  if (customDest) return customDest;
  const id = regionSelect?.value;
  if (!id) return null;
  return REGIONS.find((r) => r.id === id) || null;
}

let calcToken = 0;

async function calculate() {
  const dest = currentDest();
  if (!dest) {
    if (locStatus) locStatus.textContent = t("need_loc");
    if (result) {
      result.hidden = true;
    }
    regionSelect?.focus();
    return;
  }

  const token = ++calcToken;
  if (calcBtn) {
    calcBtn.disabled = true;
    calcBtn.textContent = t("calculating");
  }

  try {
    // Önce anında yerel süre göster — buton “çalışmıyor” gibi donmasın
    const quick = localEta(dest);
    if (token === calcToken) renderEta(dest, quick);

    const eta = await routeEta(dest);
    if (token === calcToken) renderEta(dest, eta);
  } catch (err) {
    console.warn("eta", err);
    if (token === calcToken) renderEta(dest, localEta(dest));
    if (locStatus) locStatus.textContent = t("hint_fallback");
  } finally {
    if (calcBtn && token === calcToken) {
      calcBtn.disabled = false;
      calcBtn.textContent = t("calc");
    }
  }
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
  syncLocationField(customDest);
  calculate();
}

function geoOnce(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error("unsupported"), { code: 0 }));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/** Anlık konum: önce hızlı/cache, sonra yüksek doğruluk */
async function requestLiveLocation() {
  if (!window.isSecureContext) {
    throw Object.assign(new Error("insecure"), { code: -1 });
  }
  if (!navigator.geolocation) {
    throw Object.assign(new Error("unsupported"), { code: 0 });
  }

  // 1) Hızlı: son bilinen / düşük doğruluk
  try {
    return await geoOnce({
      enableHighAccuracy: false,
      maximumAge: 120000,
      timeout: 8000,
    });
  } catch (_) {
    /* devam */
  }

  // 2) Yüksek doğruluk
  try {
    return await geoOnce({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });
  } catch (err) {
    // 3) Son deneme: daha uzun, düşük doğruluk
    return geoOnce({
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 15000,
    }).catch(() => {
      throw err;
    });
  }
}

function applyLiveLocation(pos, { openMap = true, zoom = 15 } = {}) {
  const { latitude, longitude } = pos.coords;
  if (openMap) {
    ensureMap();
    if (mapWrap) mapWrap.hidden = false;
    if (pickMap) {
      pickMap.setView([latitude, longitude], zoom);
      setTimeout(() => pickMap.invalidateSize(), 100);
    }
  }
  setCustomDest(latitude, longitude, "my_location");
  if (locStatus) {
    locStatus.textContent = `${t("gps_ok")} · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
  return { latitude, longitude };
}

function gpsErrorMessage(err) {
  const code = err && typeof err.code === "number" ? err.code : null;
  if (code === 1) return t("gps_denied");
  if (code === 2) return t("gps_unavailable");
  if (code === 3) return t("gps_timeout");
  if (code === -1) return t("gps_insecure");
  return t("gps_fail");
}

async function grabLiveLocation({ openMap = true } = {}) {
  if (gpsBtn) gpsBtn.disabled = true;
  if (pinBtn) pinBtn.disabled = true;
  if (locStatus) locStatus.textContent = t("gps_getting");
  try {
    const pos = await requestLiveLocation();
    applyLiveLocation(pos, { openMap });
    return true;
  } catch (err) {
    console.warn("gps", err);
    if (locStatus) locStatus.textContent = gpsErrorMessage(err);
    if (openMap) {
      ensureMap();
      if (mapWrap) mapWrap.hidden = false;
      setTimeout(() => pickMap?.invalidateSize(), 100);
    }
    return false;
  } finally {
    if (gpsBtn) gpsBtn.disabled = false;
    if (pinBtn) pinBtn.disabled = false;
  }
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

function buildWhatsAppMessage() {
  const dest = currentDest();
  const phone = (fPhone?.value || "").trim();
  const size = (fSize?.value || "").trim();
  const desc = (fDesc?.value || "").trim();
  const locName = dest?.name || "-";
  const locUrl = dest ? mapsPinUrl(dest) : "";
  const etaLine = lastEta
    ? `${lastEta.minutes} dk · ~${arrivalClock(lastEta.minutes)}`
    : "-";

  return [
    "DOĞAN LASTİK — ACİL TALEP",
    `Cep: ${phone}`,
    `Lastik: ${size}`,
    `Konum: ${locName}`,
    locUrl,
    `Varış: ${etaLine}`,
    `Sorun: ${desc}`,
  ].join("\n");
}

function openWaChat(phone, text) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}

function openWhatsAppOrder() {
  const dest = currentDest();
  if (!dest) {
    formStatus.textContent = t("need_loc");
    fLoc?.classList.remove("is-filled");
    fLoc?.focus();
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  syncLocationField(dest);

  const phoneOk = fPhone.value.trim();
  const sizeOk = fSize.value.trim();
  const descOk = fDesc.value.trim();
  const locOk = fLoc.value.trim();

  if (!phoneOk || !sizeOk || !descOk || !locOk) {
    formStatus.textContent = t("form_required");
    if (!phoneOk) fPhone.focus();
    else if (!sizeOk) fSize.focus();
    else if (!descOk) fDesc.focus();
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  const msg = buildWhatsAppMessage();
  formStatus.textContent = t("form_opening");

  // Aynı mesaj (ebat + konum + sorun) iki WhatsApp’a: 0533 sonra 0548
  openWaChat(WA_NUMBERS[0], msg);
  const url2 = `https://wa.me/${WA_NUMBERS[1]}?text=${encodeURIComponent(msg)}`;
  setTimeout(() => {
    window.location.href = url2;
  }, 400);

  return true;
}

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  openWhatsAppOrder();
});

gpsBtn?.addEventListener("click", () => {
  grabLiveLocation({ openMap: true });
});

pinBtn?.addEventListener("click", async () => {
  // Harita açılınca önce anlık konum alınsın
  const ok = await grabLiveLocation({ openMap: true });
  if (ok && locStatus) {
    locStatus.textContent = `${t("gps_ok")} — ${t("map_hint_adjust")}`;
  } else if (locStatus) {
    locStatus.textContent = `${locStatus.textContent} ${t("map_hint")}`;
  }
});

calcBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  renderEta.shouldScroll = true;
  calculate();
});

regionSelect?.addEventListener("change", () => {
  if (!regionSelect.value) return;
  customDest = null;
  const dest = REGIONS.find((r) => r.id === regionSelect.value);
  if (dest) syncLocationField(dest);
  // otomatik hesapta sayfayı aşağı kaydırma
  renderEta.shouldScroll = false;
  calculate();
});

langSwitch?.addEventListener("change", () => {
  I()?.setLang(langSwitch.value);
  fillRegions();
  calcBtn.textContent = t("calc");
  if (fDesc && !fDesc.value) fDesc.placeholder = t("form_desc_ph");
  if (fLoc && !fLoc.value) fLoc.placeholder = t("form_loc_ph");
  // dil değişince seçili konum varsa kutuyu yenile
  if (currentDest()) syncLocationField(currentDest());
  if (!result.hidden && currentDest()) calculate();
  else if (hint) hint.textContent = t("hint_default");
});

document.addEventListener("dls:lang", () => {
  fillRegions();
  if (calcBtn) calcBtn.textContent = t("calc");
  if (fDesc && !fDesc.value) fDesc.placeholder = t("form_desc_ph");
  if (fLoc && !fLoc.value) fLoc.placeholder = t("form_loc_ph");
  if (currentDest()) syncLocationField(currentDest());
});

const menuBtn = document.getElementById("menu-btn");
const menuClose = document.getElementById("menu-close");
const sideMenu = document.getElementById("side-menu");
const menuBackdrop = document.getElementById("menu-backdrop");

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  if (sideMenu) sideMenu.setAttribute("aria-hidden", open ? "false" : "true");
  if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (menuBackdrop) menuBackdrop.hidden = !open;
}

menuBtn?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => setMenu(false));
menuBackdrop?.addEventListener("click", () => setMenu(false));
sideMenu?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => setMenu(false));
});

if (I()) I().init();
if (hint) hint.textContent = t("hint_default");
if (fLoc) fLoc.placeholder = t("form_loc_ph");
if (fDesc) fDesc.placeholder = t("form_desc_ph");
if (currentDest()) syncLocationField(currentDest());

// Sayfa açılışında sessiz anlık konum (izin varsa)
if (navigator.geolocation && window.isSecureContext) {
  requestLiveLocation()
    .then((pos) => {
      if (customDest || regionSelect?.value) return;
      applyLiveLocation(pos, { openMap: false });
    })
    .catch(() => {});
}

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
