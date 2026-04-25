export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Runway-Version',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    // ── Pollinations proxy (sketch generation, no key needed) ────────────────
    if (path.startsWith('/pollinations/')) {
      const encodedPrompt = path.replace('/pollinations/', '');
      const params = url.search;
      const res = await fetch(`https://image.pollinations.ai/prompt/${decodeURIComponent(encodedPrompt)}${params}`);
      if (!res.ok) return new Response('Image fetch failed', { status: res.status, headers: cors });
      const blob = await res.arrayBuffer();
      return new Response(blob, {
        status: 200,
        headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'image/jpeg' },
      });
    }

    // ── Runway proxy (photo upscale, requires RUNWAY_API_KEY secret) ─────────
    if (path.startsWith('/runway/')) {
      const runwayPath = path.replace('/runway', '');
      const body = request.method !== 'GET' ? await request.text() : undefined;
      const res = await fetch(`https://api.dev.runwayml.com/v1${runwayPath}`, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06',
          'Authorization': `Bearer ${env.RUNWAY_API_KEY}`,
        },
        body,
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ── Serve index.html from GitHub (static asset) ──────────────────────────
    return env.ASSETS.fetch(request);
  }
};
