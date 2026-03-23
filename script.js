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

function extractYouTubeHandle(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const handle = parts.find((p) => p.startsWith("@"));
    return handle ? handle.replace("@", "") : "";
  } catch {
    return "";
  }
}

async function getKickChannelData(username) {
  try {
    if (!username) {
      return { isLive: false, avatar: "kk.png" };
    }

    const res = await fetch(`https://kick.com/api/v2/channels/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!res.ok) {
      return { isLive: false, avatar: "kk.png" };
    }

    const data = await res.json();

    return {
      isLive: !!data?.livestream,
      avatar:
        data?.user?.profile_pic ||
        data?.user?.profile_picture ||
        data?.profile_picture ||
        data?.profilepic ||
        "kk.png"
    };
  } catch (err) {
    console.error("Kick kanal verisi alınamadı:", err);
    return { isLive: false, avatar: "kk.png" };
  }
}

function getYouTubeAvatar(url) {
  const handle = extractYouTubeHandle(url);
  if (!handle) return "yt.png";
  return `https://unavatar.io/youtube/${encodeURIComponent(handle)}`;
}

function getPlatformLabel(platform) {
  if (platform === "kick") return "Kick Yayıncısı";
  if (platform === "youtube") return "YouTube Yayıncısı";
  return "Yayıncı";
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

function renderTop10(data) {
  const top10List = document.querySelector(".top10-list");
  if (!top10List) return;

  top10List.innerHTML = "";

  if (!data.length) {
    top10List.innerHTML = `
      <div class="top10-card">
        <div class="top10-empty">Top 10 listesi, takip verileri biriktikçe burada otomatik görünecek.</div>
      </div>
    `;
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

function createChannelCard(item) {
  const card = document.createElement("div");
  card.className = "channel-card";

  const badgeClass = item.live ? "live-badge" : "offline-badge";
  const badgeText = item.live ? "● CANLI" : "● OFFLINE";
  const platformText = getPlatformLabel(item.platform);
  const safeUrl = item.url || "#";
  const rel = safeUrl === "#" ? "" : `target="_blank" rel="noopener noreferrer"`;

  card.innerHTML = `
    <img
      class="channel-avatar"
      src="${escapeAttr(item.avatar || "kk.png")}"
      alt="${escapeHtml(item.name)}"
      onerror="this.onerror=null;this.src='${item.platform === "youtube" ? "yt.png" : "kk.png"}'"
    >
    <div class="channel-main">
      <div class="channel-top">
        <div class="channel-name">${escapeHtml(item.name)}</div>
        <span class="${badgeClass}">${badgeText}</span>
      </div>
      <div class="channel-platform">${platformText}</div>
      <a class="channel-link" href="${escapeAttr(safeUrl)}" ${rel}>Kanala Git</a>
    </div>
  `;

  if (safeUrl === "#") {
    const link = card.querySelector(".channel-link");
    link.addEventListener("click", (e) => e.preventDefault());
  }

  return card;
}

async function renderAllStreamers(workerData) {
  const allList = document.querySelector(".all-list");
  if (!allList) return;

  allList.innerHTML = "";

  if (!workerData.length) {
    allList.innerHTML = `
      <div class="top10-card">
        <div class="top10-empty">Henüz yayıncı yok.</div>
      </div>
    `;
    return;
  }

  const enriched = await Promise.all(
    workerData.map(async (item) => {
      if (item.platform === "kick") {
        const kickData = await getKickChannelData(extractKickUsername(item.url));
        return {
          ...item,
          live: kickData.isLive,
          avatar: kickData.avatar || "kk.png"
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

  const ordered = [
    ...enriched.filter((x) => x.live),
    ...enriched.filter((x) => !x.live).sort((a, b) => a.name.localeCompare(b.name, "tr"))
  ];

  ordered.forEach((item) => {
    allList.appendChild(createChannelCard(item));
  });
}

async function loadStreamers() {
  try {
    const res = await fetch(WORKER_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    renderTop10(data);
    await renderAllStreamers(data);
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

loadStreamers();
setInterval(loadStreamers, 60000);
