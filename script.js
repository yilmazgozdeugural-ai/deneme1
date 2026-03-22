async function isYouTubeLive(channelUrl, username) {
  try {
    const res = await fetch(
      `https://youtube-stream-checker.vercel.app/api/check-live?url=${encodeURIComponent(channelUrl)}&username=${encodeURIComponent(username)}`
    );
    const data = await res.json();
    return data.live;
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
    return {
      isLive: false,
      avatar: "kk.png"
    };
  }
}

function extractKickUsername(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0]?.toLowerCase() || "";
  } catch (err) {
    return "";
  }
}

function extractYouTubeHandle(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const handle = parts.find((p) => p.startsWith("@"));
    return handle ? handle.replace("@", "") : "";
  } catch (err) {
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

function createCard(channel, isLive, platform, avatarUrl) {
  const card = document.createElement("div");
  card.className = "channel-card";

  const label = getPlatformLabel(platform);
  const badge = isLive
    ? `<span class="live-badge">● CANLI</span>`
    : `<span class="offline-badge">● OFFLINE</span>`;

  const fallbackIcon = getFallbackIcon(platform);

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
      <a class="channel-link" href="${channel.url}" target="_blank" rel="noopener noreferrer">
        Kanala Git
      </a>
    </div>
  `;

  return card;
}

async function loadChannels() {
  try {
    const res = await fetch("channels.json");
    const data = await res.json();

    const youtubeList = document.querySelector(".youtube-list");
    const kickList = document.querySelector(".kick-list");

    youtubeList.innerHTML = "";
    kickList.innerHTML = "";

    const youtubeStatuses = await Promise.all(
      data.youtube.map(async (channel) => {
        const isLive = await isYouTubeLive(channel.url.trim(), channel.name.trim());
        const avatar = getYouTubeAvatar(channel);

        return { ...channel, isLive, avatar };
      })
    );

    const orderedYoutube = [
      ...youtubeStatuses.filter((c) => c.isLive),
      ...youtubeStatuses.filter((c) => !c.isLive),
    ];

    orderedYoutube.forEach((channel) => {
      youtubeList.appendChild(
        createCard(channel, channel.isLive, "youtube", channel.avatar)
      );
    });

    const kickStatuses = await Promise.all(
      data.kick.map(async (channel) => {
        const username = extractKickUsername(channel.url);
        const kickData = username
          ? await getKickChannelData(username)
          : { isLive: false, avatar: "kk.png" };

        return {
          ...channel,
          isLive: kickData.isLive,
          avatar: kickData.avatar
        };
      })
    );

    const orderedKick = [
      ...kickStatuses.filter((c) => c.isLive),
      ...kickStatuses.filter((c) => !c.isLive),
    ];

    orderedKick.forEach((channel) => {
      kickList.appendChild(
        createCard(channel, channel.isLive, "kick", channel.avatar)
      );
    });
  } catch (err) {
    console.error("Kanal listesi yüklenemedi:", err);
  }
}

loadChannels();
