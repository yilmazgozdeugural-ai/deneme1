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
      top10List.innerHTML = `<div class="top10-empty">Top 10 verisi yüklenemedi.</div>`;
    }

    if (allList) {
      allList.innerHTML = `<div class="top10-empty">Yayıncı verisi yüklenemedi.</div>`;
    }
  }
}

function renderTop10(data) {
  const top10List = document.querySelector(".top10-list");
  if (!top10List) return;

  top10List.innerHTML = "";

  data.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "top10-item";

    row.innerHTML = `
      <div class="top10-rank">#${index + 1}</div>
      <div class="top10-name">${escapeHtml(item.name)}</div>
      <div class="top10-time">${escapeHtml(item.hoursText || "0 dk")}</div>
    `;

    top10List.appendChild(row);
  });

  if (!data.length) {
    top10List.innerHTML = `<div class="top10-empty">Henüz veri yok.</div>`;
  }
}

function renderAllStreamers(data) {
  const allList = document.querySelector(".all-list");
  if (!allList) return;

  allList.innerHTML = "";

  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "channel-card";

    const statusClass = item.live ? "live" : "offline";
    const statusText = item.live ? "CANLI" : "OFFLINE";
    const platformText = item.platform === "kick" ? "Kick Yayıncısı" : "Yayıncı";

    card.innerHTML = `
      <div class="channel-left">
        <div class="channel-avatar-wrap">
          <div class="channel-avatar"></div>
        </div>

        <div class="channel-meta">
          <div class="channel-top">
            <div class="channel-name">${escapeHtml(item.name)}</div>
            <div class="status-pill ${statusClass}">${statusText}</div>
          </div>
          <div class="channel-role">${platformText}</div>
          <a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" class="go-btn">Kanala Git</a>
        </div>
      </div>
    `;

    allList.appendChild(card);
  });

  if (!data.length) {
    allList.innerHTML = `<div class="top10-empty">Henüz yayıncı yok.</div>`;
  }
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
async function loadTop10FromWorker() {
  try {
    const res = await fetch("https://yayincilarimiz.apexmykolive.workers.dev/");
    const data = await res.json();

    const top10List = document.querySelector(".top10-list");
    top10List.innerHTML = "";

    data.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "top10-card";

      card.innerHTML = `
        <div class="top10-rank">#${index + 1}</div>
        <div class="top10-main">
          <div class="top10-name">${item.name} — ${item.hoursText}</div>
        </div>
      `;

      top10List.appendChild(card);
    });

  } catch (err) {
    console.error("Top10 worker hatası:", err);
  }
}
