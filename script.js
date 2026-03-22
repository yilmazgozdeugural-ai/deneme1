const STREAM_STATS_URL = "https://yayincilarimiz.apexmykolive.workers.dev";

async function isYouTubeLive(channelUrl, username) {
  try {
    if (!channelUrl || channelUrl === "-") return false;
    const res = await fetch(
      `https://youtube-stream-checker.vercel.app/api/check-live?url=${encodeURIComponent(channelUrl)}&username=${encodeURIComponent(username)}`
    );
    const data = await res.json();
    return Boolean(data.live);
  } catch (err) {
    console.error("YouTube canlı kontrol hatası:", err);
    return false;
  }
}

async function getKickChannelData(username) {
  try {
    const res = await fetch(`https://kick.com/api/v1/channels/${username}`);
    const data = await res.json();

    return {
      isLive: data?.livestream !== null,
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

function getYouTubeAvatar(channel) {
  const handle = extractYouTubeHandle(channel.url);
  if (!handle) return "yt.png";
  return `https://unavatar.io/youtube/${encodeURIComponent(handle)}`;
}

function getFallbackIcon(platform) {
  if (platform === "kick") return "kk.png";
  if (platform === "youtube") return "yt.png";
  return "yt.png";
}

function getPlatformLabel(platform) {
  if (platform === "kick") return "Kick Yayıncısı";
  if (platform === "youtube") return "YouTube Yayıncısı";
  return "";
}

function formatMinutes(totalMinutes) {
  const safe = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}s ${minutes}dk`;
}

function normalizeStatsMap(raw) {
  if (!raw || typeof raw !== "object") return {};
  return raw;
}

function getStatForChannel(statsMap, channel) {
  return statsMap[channel.id] || null;
}

function createCard(channel, isLive, platform, avatarUrl) {
  const card = document.createElement("div");
  card.className = "channel-card";

  const label = getPlatformLabel(platform);
  const badge = isLive
    ? `<span class="live-badge">● CANLI</span>`
    : `<span class="offline-badge">● OFFLINE</span>`;

  const fallbackIcon = getFallbackIcon(platform);
  const safeUrl = channel.url && channel.url !== "-" ? channel.url : "#";
  const safeRel = safeUrl === "#" ? "" : 'target="_blank" rel="noopener noreferrer"';

  card.innerHTML = `
    <img
      class="channel-avatar"
      src="${avatarUrl || fallbackIcon}"
      alt="${channel.name}"
      onerror="this.onerror=null;this.src='${fallbackIcon}'"
    >
    <div class="channel-main">
      <div class="channel-top">
        <div class="channel-name">${channel.name}</div>
        ${badge}
      </div>
      <div class="channel-platform">${label}</div>
      <a class="channel-link" href="${safeUrl}" ${safeRel}>
        Kanala Git
      </a>
    </div>
  `;

  if (safeUrl === "#") {
    const link = card.querySelector(".channel-link");
    link.addEventListener("click", (e) => e.preventDefault());
  }

  return card;
}

function createTop10Card(channelName, weeklyMinutes, rank) {
  const card = document.createElement("div");
  card.className = "top10-card";
  card.innerHTML = `
    <div class="top10-rank">#${rank}</div>
    <div class="top10-main">
      <div class="top10-name">${channelName} — ${formatMinutes(weeklyMinutes)}</div>
    </div>
  `;
  return card;
}

async function loadChannels() {
  try {
    const [channelsRes, statsRes] = await Promise.all([
      fetch("channels.json"),
      fetch(STREAM_STATS_URL).catch(() => null)
    ]);

    const channels = await channelsRes.json();
    const statsMap = statsRes && statsRes.ok ? normalizeStatsMap(await statsRes.json()) : {};

    const allList = document.querySelector(".all-list");
    const top10List = document.querySelector(".top10-list");
    allList.innerHTML = "";
    top10List.innerHTML = "";

    const allChannels = await Promise.all(
      (channels || []).map(async (channel) => {
        const stat = getStatForChannel(statsMap, channel);

        if (channel.platform === "youtube") {
          const live = !channel.url || channel.url === "-"
            ? false
            : await isYouTubeLive(channel.url.trim(), channel.name.trim());

          return {
            ...channel,
            platformKey: "youtube",
            isLive: live || Boolean(stat?.currentLive),
            avatar: getYouTubeAvatar(channel),
            weeklyMinutes: stat?.weeklyMinutes || 0
          };
        }

        if (channel.platform === "kick") {
          const username = channel.slug || "";
          const kickData = username
            ? await getKickChannelData(username)
            : { isLive: false, avatar: "kk.png" };

          return {
            ...channel,
            platformKey: "kick",
            isLive: Boolean(kickData.isLive || stat?.currentLive),
            avatar: kickData.avatar,
            weeklyMinutes: stat?.weeklyMinutes || 0
          };
        }

        return {
          ...channel,
          platformKey: channel.platform,
          isLive: Boolean(stat?.currentLive),
          avatar: getFallbackIcon(channel.platform),
          weeklyMinutes: stat?.weeklyMinutes || 0
        };
      })
    );

    const orderedAll = [
      ...allChannels.filter((c) => c.isLive),
      ...allChannels.filter((c) => !c.isLive).sort((a, b) => a.name.localeCompare(b.name, "tr")),
    ];

    orderedAll.forEach((channel) => {
      allList.appendChild(createCard(channel, channel.isLive, channel.platformKey, channel.avatar));
    });

    const ranked = [...allChannels]
      .filter((c) => (c.weeklyMinutes || 0) > 0)
      .sort((a, b) => (b.weeklyMinutes || 0) - (a.weeklyMinutes || 0))
      .slice(0, 10);

    if (!ranked.length) {
      const empty = document.createElement("div");
      empty.className = "top10-card";
      empty.innerHTML = `<div class="top10-empty">Top 10 listesi, takip verileri biriktikçe burada otomatik görünecek.</div>`;
      top10List.appendChild(empty);
    } else {
      ranked.forEach((channel, index) => {
        top10List.appendChild(createTop10Card(channel.name, channel.weeklyMinutes, index + 1));
      });
    }
  } catch (err) {
    console.error("Kanal listesi yüklenemedi:", err);
  }
}

loadChannels();
