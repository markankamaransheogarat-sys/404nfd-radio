import { Router } from "express";
import { fetchDurations } from "../services/youtube.js";

const router = Router();

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
}

router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({ error: "Missing query param 'q'" });
    return;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Search is not configured (missing YOUTUBE_API_KEY)" });
    return;
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoCategoryId", "10"); // Music
    url.searchParams.set("videoEmbeddable", "true"); // exclude videos the owner disabled embedding for
    url.searchParams.set("maxResults", "15");
    url.searchParams.set("q", q);
    url.searchParams.set("key", apiKey);

    const ytRes = await fetch(url);
    if (!ytRes.ok) {
      const body = await ytRes.text();
      res.status(502).json({ error: "YouTube search failed", detail: body.slice(0, 300) });
      return;
    }

    const data = (await ytRes.json()) as { items: YouTubeSearchItem[] };
    const videoIds = data.items.map((item) => item.id.videoId);
    const durations = await fetchDurations(apiKey, videoIds);

    const results = data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
      durationSeconds: durations.get(item.id.videoId) ?? 0,
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Search failed", detail: String(err) });
  }
});

export default router;
