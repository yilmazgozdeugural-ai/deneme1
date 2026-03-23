const WORKER_URL = "https://yayincilarimiz.apexmykolive.workers.dev/";

function extractKickUsername(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

async function getKickAvatar(username) {
  try {
    if (!username) return "kk.png";

    const res = await fetch(`https://kick.com/api/v2/channels/${username}`);
    const data = await res.json();

    return (
      data?.user?.profile_pic ||
      data?.user?.profile_picture ||
      "kk.png"
    );
  } catch {
    return "kk.png";
  }
}

function getYouTubeAvatar(url) {
  return `https://unavatar.io/youtube/${url}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTop10(data) {
  const list = document.querySelector(".top10-list");
  if (!list) return;

  list.innerHTML = "";

  data.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "top10-card";

    div.innerHTML = `
      <div class="top10-rank">#${index + 1}</div>
      <div class="top10-main">
        <div class="top10-name">${escapeHtml(item.name)}</div>
        <div class="top10-time">${item.hoursText}</div>
      </div>
    `;

    list.appendChild(div);
  });
}

function createCard(item) {
  const div = document.createElement("div");
  div.className = "channel-card";

  const isLive = item.live;
  const badge = isLive ? "live-badge" : "offline-badge";
  const text = isLive ? "● CANLI" : "● OFFLINE";

  div.innerHTML = `
    <img class="channel-avatar" src="${item.avatar}" />
    <div class="channel-main">
      <div class="channel-top">
        <div class="channel-name">${item.name}</div>
        <span class="${badge}">${text}</span>
      </div>
      <a href="${item.url}" target="_blank" class="channel-link">Kanala Git</a>
    </div>
  `;

  return div;
}

async function renderAll(data) {
  const list = document.querySelector(".all-list");
  if (!list) return;

  list.innerHTML = "";

  const enriched = await Promise.all(
    data.map(async (item) => {
      if (item.platform === "kick") {
        return {
          ...item,
          avatar: await getKickAvatar(extractKickUsername(item.url))
        };
      }

      if (item.platform === "youtube") {
        return {
          ...item,
          avatar: getYouTubeAvatar(item.url)
        };
      }

      return {
        ...item,
        avatar: "kk.png"
      };
    })
  );

  // 🔥 SADECE WORKER LIVE KULLANILIYOR
  const ordered = [
    ...enriched.filter((x) => x.live),
    ...enriched.filter((x) => !x.live)
  ];

  ordered.forEach((item) => {
    list.appendChild(createCard(item));
  });
}

async function load() {
  try {
    const res = await fetch(WORKER_URL);
    const data = await res.json();

    renderTop10(data);
    await renderAll(data);
  } catch (e) {
    console.error("Hata:", e);
  }
}

load();
setInterval(load, 60000);
