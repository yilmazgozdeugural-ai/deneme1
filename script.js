const WORKER_URL = "https://yayincilarimiz.apexmykolive.workers.dev/";

async function loadStreamers() {
  try {
    const res = await fetch(WORKER_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    renderTop10(data);
    renderAllStreamers(data);
  } catch (error) {
    console.error("Veri çekme hatası:", error);

    const top10List = document.querySelector(".top10-list");
    const allList = document.querySelector(".all-list");

    if (top10List) {
      top10List.innerHTML = `<div class="top10-card"><div class="top10-empty">Top 10 verisi yüklenemedi.</div></div>`;
    }

    if (allList) {
      allList.innerHTML = `<div class="top10-card"><div class="top10-empty">Yayıncı verisi yüklenemedi.</div></div>`;
    }
  }
}

function renderTop10(data) {
  const top10List = document.querySelector(".top10-list");
  if (!top10List) return;

  top10List.innerHTML = "";

  if (!data.length) {
    top10List.innerHTML = `<div class="top10-card"><div class="top10-empty">Henüz veri yok.</div></div>`;
    return;
  }

  data.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "top10-card";

    card.innerHTML = `
      <div class="top10-rank">#${index + 1}</div>
      <div class="top10-main">
        <div class="top10-name">${escapeHtml(item.name)}</div>
        <div class="top10-time">${escapeHtml(item.hoursText || "0 dk")}</div>
      </div>
    `;

    top10List.appendChild(card);
  });
}

function renderAllStreamers(data) {
  const allList = document.querySelector(".all-list");
  if (!allList) return;

  allList.innerHTML = "";

  if (!data.length) {
    allList.innerHTML = `<div class="top10-card"><div class="top10-empty">Henüz yayıncı yok.</div></div>`;
    return;
  }

  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "channel-card";

    const badgeClass = item.live ? "live-badge" : "offline-badge";
    const badgeText = item.live ? "● CANLI" : "● OFFLINE";
    const platformText = item.platform === "kick" ? "Kick Yayıncısı" : "Yayıncı";

    const avatar = getAvatarByName(item.name);

    card.innerHTML = `
      <img
        class="channel-avatar"
        src="${escapeAttr(avatar)}"
        alt="${escapeHtml(item.name)}"
        onerror="this.onerror=null;this.src='kk.png'"
      >
      <div class="channel-main">
        <div class="channel-top">
          <div class="channel-name">${escapeHtml(item.name)}</div>
          <span class="${badgeClass}">${badgeText}</span>
        </div>
        <div class="channel-platform">${platformText}</div>
        <a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" class="channel-link">
          Kanala Git
        </a>
      </div>
    `;

    allList.appendChild(card);
  });
}

function getAvatarByName(name) {
  const avatars = {
    "closer": "closer.png",
    "CNN": "cnn.png",
    "AnIL": "anil.png",
    "ApexMyko": "apexmyko.png",
    "CsKaya": "cskaya.png"
  };

  return avatars[name] || "kk.png";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return String(value ?? "").replaceAll('"', "&quot;");
}

loadStreamers();
setInterval(loadStreamers, 60000);
