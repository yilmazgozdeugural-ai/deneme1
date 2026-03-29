const WORKER_URL = "https://yayincilarimiz.apexmykolive.workers.dev/";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFallbackAvatar(platform) {
  return platform === "youtube" ? "yt.png" : "kk.png";
}

function renderTop10(data) {
  const list = document.querySelector(".top10-list");
  if (!list) return;

  list.innerHTML = "";

  data.slice(0, 10).forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "top10-card";

    div.innerHTML = `
      <div class="top10-rank">#${index + 1}</div>
      <div class="top10-main">
        <div class="top10-name">${escapeHtml(item.name)}</div>
        <div class="top10-time">${escapeHtml(item.hoursText || "0 dk")}</div>
      </div>
    `;

    list.appendChild(div);
  });
}

function createCard(item) {
  const div = document.createElement("div");
  div.className = "channel-card";

  const isLive = !!item.live;
  const badge = isLive ? "live-badge" : "offline-badge";
  const text = isLive ? "● CANLI" : "● OFFLINE";

  const safeName = escapeHtml(item.name);
  const safeUrl = escapeHtml(item.url || "#");
  const safeAvatar = escapeHtml(item.avatar || getFallbackAvatar(item.platform));
  const fallbackAvatar = getFallbackAvatar(item.platform);

  div.innerHTML = `
    <img 
      class="channel-avatar" 
      src="${safeAvatar}" 
      alt="${safeName}"
      onerror="this.onerror=null;this.src='${fallbackAvatar}'"
    />
    <div class="channel-main">
      <div class="channel-top">
        <div class="channel-name">${safeName}</div>
        <span class="${badge}">${text}</span>
      </div>
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="channel-link">Kanala Git</a>
    </div>
  `;

  return div;
}

async function renderAll(data) {
  const list = document.querySelector(".all-list");
  if (!list) return;

  list.innerHTML = "";

  const normalized = data.map((item) => ({
    ...item,
    avatar: item.avatar || getFallbackAvatar(item.platform)
  }));

  const ordered = [
    ...normalized.filter((x) => x.live),
    ...normalized.filter((x) => !x.live)
  ];

  ordered.forEach((item) => {
    list.appendChild(createCard(item));
  });
}

async function load() {
  try {
    const res = await fetch(WORKER_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Worker hatası: ${res.status}`);

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Worker beklenen dizi formatında veri döndürmedi.");
    }

    renderTop10(data);
    await renderAll(data);
  } catch (e) {
    console.error("Hata:", e);
  }
}

load();
setInterval(load, 60000);
