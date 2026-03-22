import fs from 'node:fs';
import path from 'node:path';

const CHANNELS_FILE = path.resolve('channels.json');
const STATS_FILE = path.resolve('stream_stats.json');
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function getWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function ensureStat(stats, channel, weekKey) {
  if (!stats[channel.name]) {
    stats[channel.name] = {
      platform: channel.platform,
      url: channel.url,
      weeklyMinutes: 0,
      weekKey,
      currentLive: false,
      liveSince: null,
      currentSessionMinutes: 0,
      lastUpdatedAt: null,
      lastStreamId: null,
      lastError: null
    };
  }

  const item = stats[channel.name];
  item.platform = channel.platform;
  item.url = channel.url;

  if (item.weekKey !== weekKey) {
    item.weekKey = weekKey;
    item.weeklyMinutes = 0;
    item.currentSessionMinutes = 0;
    item.currentLive = false;
    item.liveSince = null;
    item.lastStreamId = null;
  }

  return item;
}

function extractKickUsername(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
  } catch {
    return '';
  }
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchKickLiveState(channel) {
  const username = extractKickUsername(channel.url);
  if (!username) {
    return { isLive: false, startedAt: null, streamId: null };
  }

  const res = await fetch(`https://kick.com/api/v1/channels/${username}`, {
    headers: { 'accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`Kick HTTP ${res.status}`);
  }

  const data = await res.json();
  const livestream = data?.livestream;

  return {
    isLive: livestream !== null,
    startedAt: normalizeTimestamp(
      livestream?.created_at || livestream?.start_time || livestream?.started_at || livestream?.session_title_updated_at
    ),
    streamId: livestream?.id ? String(livestream.id) : null
  };
}

async function fetchYouTubeLiveState(channel) {
  if (!YOUTUBE_API_KEY || !channel.channelID || channel.channelID === '-') {
    return { isLive: false, startedAt: null, streamId: null };
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('channelId', channel.channelID);
  searchUrl.searchParams.set('eventType', 'live');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '1');
  searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`YouTube search HTTP ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const item = searchData?.items?.[0];
  const videoId = item?.id?.videoId;

  if (!videoId) {
    return { isLive: false, startedAt: null, streamId: null };
  }

  const videoUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videoUrl.searchParams.set('part', 'liveStreamingDetails');
  videoUrl.searchParams.set('id', videoId);
  videoUrl.searchParams.set('key', YOUTUBE_API_KEY);

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new Error(`YouTube videos HTTP ${videoRes.status}`);
  }

  const videoData = await videoRes.json();
  const details = videoData?.items?.[0]?.liveStreamingDetails || {};

  return {
    isLive: true,
    startedAt: normalizeTimestamp(details.actualStartTime || item?.snippet?.publishedAt),
    streamId: videoId
  };
}

function applyLiveState(stat, liveState, nowIso) {
  const now = new Date(nowIso);

  if (!liveState.isLive) {
    stat.currentLive = false;
    stat.liveSince = null;
    stat.currentSessionMinutes = 0;
    stat.lastStreamId = null;
    stat.lastUpdatedAt = nowIso;
    stat.lastError = null;
    return;
  }

  const streamId = liveState.streamId || stat.lastStreamId || 'live';
  const startedAt = liveState.startedAt || stat.liveSince || nowIso;
  const startDate = new Date(startedAt);
  const sessionMinutes = Math.max(0, Math.floor((now - startDate) / 60000));

  if (stat.lastStreamId && stat.lastStreamId !== streamId) {
    stat.currentSessionMinutes = 0;
  }

  if (!stat.currentLive || !stat.liveSince) {
    stat.liveSince = startedAt;
    stat.currentSessionMinutes = 0;
  }

  const delta = Math.max(0, sessionMinutes - (stat.currentSessionMinutes || 0));
  stat.weeklyMinutes += delta;
  stat.currentSessionMinutes = sessionMinutes;
  stat.currentLive = true;
  stat.liveSince = startedAt;
  stat.lastStreamId = streamId;
  stat.lastUpdatedAt = nowIso;
  stat.lastError = null;
}

async function main() {
  const channelsData = readJson(CHANNELS_FILE, { kick: [], youtube: [] });
  const stats = readJson(STATS_FILE, {});
  const weekKey = getWeekKey(new Date());
  const nowIso = new Date().toISOString();

  const allChannels = [
    ...(channelsData.kick || []),
    ...(channelsData.youtube || [])
  ];

  for (const channel of allChannels) {
    const stat = ensureStat(stats, channel, weekKey);

    try {
      const liveState = channel.platform === 'Kick'
        ? await fetchKickLiveState(channel)
        : await fetchYouTubeLiveState(channel);

      applyLiveState(stat, liveState, nowIso);
    } catch (error) {
      stat.lastUpdatedAt = nowIso;
      stat.lastError = error instanceof Error ? error.message : String(error);
      console.error(`Takip hatası (${channel.name}):`, stat.lastError);
    }
  }

  writeJson(STATS_FILE, stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
