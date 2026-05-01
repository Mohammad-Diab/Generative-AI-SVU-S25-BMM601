const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GROQ_MODEL      = 'qwen/qwen3-32b';
const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_DAILY_LIMIT = 5;
const COOLDOWN_MS     = 3000;
const TOP_WORD_LIMIT  = 5;

const HF_IMAGE_URL    = 'https://router.huggingface.co/nscale/v1/images/generations';
const HF_IMAGE_MODEL  = 'stabilityai/stable-diffusion-xl-base-1.0';
const IMAGE_DAILY_LIMIT = 3;
const CODE_DAILY_LIMIT  = 5;
const DEFAULT_IMAGE_DAILY_LIMIT = IMAGE_DAILY_LIMIT;

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function fingerprint(request) {
  const ip  = request.headers.get('CF-Connecting-IP')
            || request.headers.get('X-Forwarded-For')
            || 'unknown';
  const ua  = (request.headers.get('User-Agent') || '').slice(0, 120);
  const raw = new TextEncoder().encode(ip + '|' + ua);
  const buf = await crypto.subtle.digest('SHA-256', raw);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40);
}

async function checkAndRecord(key, env, dailyLimit) {
  const limit = dailyLimit;
  const today = new Date().toDateString();
  const now   = Date.now();
  let rec;

  try { rec = await env.RATE_LIMIT.get(key, { type: 'json' }); } catch { rec = null; }

  if (!rec || rec.date !== today) {
    rec = { date: today, count: 0, lastAt: 0 };
  }

  if (rec.count >= limit) {
    return { allowed: false, error: 'daily_limit' };
  }

  const wait = COOLDOWN_MS - (now - rec.lastAt);
  if (wait > 0) {
    return { allowed: false, error: 'cooldown', retryAfter: Math.ceil(wait / 1000) };
  }

  rec.count++;
  rec.lastAt = now;
  await env.RATE_LIMIT.put(key, JSON.stringify(rec), { expirationTtl: 86400 });

  return { allowed: true, remaining: limit - rec.count };
}

async function callGroq(inputs, env) {
  const key = env.GROQ_KEY;
  if (!key) return { error: 'service_unavailable' };

  console.log('→ Groq input:', inputs);

  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    res = await fetch(GROQ_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'أنت مساعد لغوي. أكمل النص بالكلمة التالية فقط. اكتب كلمة واحدة دون شرح أو علامات ترقيم. /no_think' },
          { role: 'user', content: inputs },
        ],
        max_tokens: 8,
        temperature: 0,
        logprobs: true,
        top_logprobs: TOP_WORD_LIMIT,
      }),
    });
    clearTimeout(timer);
  } catch {
    return { error: 'service_unavailable' };
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    console.error('Groq non-JSON:', res.status);
    return { error: 'service_unavailable' };
  }

  const data = await res.json();
  console.log('Groq response:', JSON.stringify(data, null, 2));

  if (data?.error) {
    console.error('Groq error:', data.error);
    return { error: 'service_unavailable' };
  }

  const choice   = data?.choices?.[0];
  const content  = choice?.logprobs?.content;
  if (!choice || !content?.length) return { error: 'no_output' };

  const isSkip = token => /<\/?think>/.test(token) || /^\s*$/.test(token);

  const startIdx = content.findIndex(t => !isSkip(t.token) && t.top_logprobs?.length > 0);
  if (startIdx === -1) return { error: 'no_output' };

  const lp = content[startIdx];

  const chosenWord = collectWord(content, startIdx);
  if (!chosenWord.text) return { error: 'no_output' };

  const top = buildTopWords(lp, chosenWord);

  if (!top.length) return { error: 'no_output' };

  const chosen = top.find(t => t.text === chosenWord.text) || {
    text: chosenWord.text,
    logprob: chosenWord.logprob,
    probability: toProbability(chosenWord.logprob),
    percent: toPercent(chosenWord.logprob),
    selected: true,
  };

  console.log('← chosen:', chosen.text, '| top:', top.map(t => t.text).join(', '));
  return { top, chosen };
}

function cleanToken(token) {
  return String(token || '')
    .replace(/<\/?think>/g, '')
    .replace(/[Ġ▁]/g, ' ');
}

function readWordPart(token, isFirst) {
  let text = cleanToken(token);
  if (!text) return { part: '', ended: true };

  if (!isFirst && /^\s/.test(text)) return { part: '', ended: true };

  text = text.replace(/^\s+/, '');
  text = text.replace(/^[.,،؛:!?؟()[\]{}"“”'«»]+/u, '');
  if (!text) return { part: '', ended: true };

  const match = text.match(/^[^ \t\r\n.,،؛:!?؟()[\]{}"“”'«»]+/u);
  if (!match) return { part: '', ended: true };

  return { part: match[0], ended: match[0].length < text.length };
}

function collectWord(content, startIdx) {
  let text = '';
  let logprob = 0;
  let tokenCount = 0;

  for (let i = startIdx; i < content.length; i++) {
    const item = content[i];
    if (!item || !Number.isFinite(item.logprob)) break;

    const { part, ended } = readWordPart(item.token, i === startIdx);
    if (!part) break;

    text += part;
    logprob += item.logprob;
    tokenCount++;
    if (ended) break;
  }

  return { text, logprob, tokenCount };
}

function toProbability(logprob) {
  const value = Math.exp(logprob);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toPercent(logprob) {
  const pct = Math.round(toProbability(logprob) * 100);
  return Math.max(1, Math.min(99, pct));
}

function looksLikeFragment(text, rawToken) {
  const clean = cleanToken(rawToken).trim();
  const hasArabic = /[\u0600-\u06FF]/u.test(text);
  const hasBoundary = /[\s.,،؛:!?؟]/u.test(clean);
  return hasArabic && !hasBoundary && text.length <= 2;
}

function buildTopWords(firstToken, chosenWord) {
  const seen = new Set();
  const candidates = [];
  const firstPart = readWordPart(firstToken.token, true).part;

  const add = (text, logprob, selected = false) => {
    const cleaned = String(text || '').trim();
    if (!cleaned || seen.has(cleaned)) return;

    seen.add(cleaned);
    candidates.push({
      text: cleaned,
      logprob,
      probability: Number(toProbability(logprob).toFixed(4)),
      percent: toPercent(logprob),
      selected,
    });
  };

  add(chosenWord.text, firstToken.logprob, true);

  for (const item of firstToken.top_logprobs || []) {
    const { part } = readWordPart(item.token, true);
    if (!part) continue;

    if (part === firstPart) {
      add(chosenWord.text, item.logprob, true);
      continue;
    }

    if (looksLikeFragment(part, item.token)) continue;

    add(part, item.logprob, false);
    if (candidates.length >= TOP_WORD_LIMIT) break;
  }

  const sorted = candidates.sort((a, b) => b.logprob - a.logprob);
  const selected = sorted.find(c => c.selected);
  const top = sorted.slice(0, TOP_WORD_LIMIT);

  if (selected && !top.includes(selected)) {
    return [selected, ...top.filter(c => c !== selected).slice(0, TOP_WORD_LIMIT - 1)];
  }

  return top;
}

async function callGroqCode(prompt, language, env) {
  const key = env.GROQ_KEY;
  if (!key) return { error: 'service_unavailable' };

  const langName = language === 'python' ? 'Python' : 'JavaScript';

  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    res = await fetch(GROQ_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: `أنت مساعد برمجي. اكتب كود ${langName} نظيفاً ومختصراً للمهمة التالية. أعد الكود فقط داخل code block واحد. لا تضف أي شرح أو تعليق. /no_think` },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.1,
      }),
    });
    clearTimeout(timer);
  } catch {
    return { error: 'service_unavailable' };
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return { error: 'service_unavailable' };

  const data = await res.json().catch(() => null);
  if (!data || data.error) return { error: 'service_unavailable' };

  const content = data?.choices?.[0]?.message?.content || '';
  if (!content) return { error: 'no_output' };

  const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const code = stripped.replace(/^```[\w]*\r?\n?/m, '').replace(/\r?\n?```\s*$/m, '').trim();
  return { code };
}

async function callHFImage(prompt, env) {
  const key = env.HF_KEY;
  if (!key) return { error: 'service_unavailable' };

  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    res = await fetch(HF_IMAGE_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HF_IMAGE_MODEL,
        prompt,
        response_format: 'b64_json',
      }),
    });
    clearTimeout(timer);
  } catch {
    return { error: 'service_unavailable' };
  }

  if (!res.ok) {
    const ct   = res.headers.get('content-type') || '';
    const body = ct.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => '');
    console.error('HF error', res.status, JSON.stringify(body));
    return { error: 'service_unavailable' };
  }

  const json = await res.json();
  const b64  = json?.data?.[0]?.b64_json;
  if (!b64) { console.error('HF no b64_json in response', JSON.stringify(json)); return { error: 'no_output' }; }

  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return { bytes, contentType: 'image/png' };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const { pathname } = new URL(request.url);

    if (request.method === 'POST' && pathname === '/llm') {
      const fp   = await fingerprint(request);
      const rate = await checkAndRecord(fp, env, parseInt(env.DAILY_LIMIT || DEFAULT_DAILY_LIMIT));

      if (!rate.allowed) {
        return respond({ error: rate.error, retryAfter: rate.retryAfter || 0 }, 429);
      }

      let body;
      try { body = await request.json(); } catch {
        return respond({ error: 'bad_request' }, 400);
      }

      if (typeof body.inputs !== 'string' || body.inputs.length > 500) {
        return respond({ error: 'bad_request' }, 400);
      }
      const inputs = body.inputs.trim().split(/\s+/).slice(0, 10).join(' ');
      if (inputs.length > 128) return respond({ error: 'bad_request' }, 400);
      if (!inputs) return respond({ error: 'bad_request' }, 400);

      const result = await callGroq(inputs, env);
      console.log('→ client input:', inputs);
      console.log('← client output:', JSON.stringify(result));
      return respond(result, result.error ? 502 : 200);
    }

    if (request.method === 'POST' && pathname === '/code') {
      const fp   = await fingerprint(request);
      const rate = await checkAndRecord(fp + ':code', env, parseInt(env.CODE_DAILY_LIMIT || CODE_DAILY_LIMIT));

      if (!rate.allowed) {
        return respond({ error: rate.error, retryAfter: rate.retryAfter || 0 }, 429);
      }

      let body;
      try { body = await request.json(); } catch {
        return respond({ error: 'bad_request' }, 400);
      }

      if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 300) {
        return respond({ error: 'bad_request' }, 400);
      }
      if (!['python', 'javascript'].includes(body.language)) {
        return respond({ error: 'bad_request' }, 400);
      }

      const result = await callGroqCode(body.prompt.trim(), body.language, env);
      return respond(result, result.error ? 502 : 200);
    }

    if (request.method === 'POST' && pathname === '/image') {
      const fp   = await fingerprint(request);
      const rate = await checkAndRecord(fp + ':img', env, parseInt(env.IMAGE_DAILY_LIMIT || DEFAULT_IMAGE_DAILY_LIMIT));

      if (!rate.allowed) {
        return respond({ error: rate.error, retryAfter: rate.retryAfter || 0 }, 429);
      }

      let body;
      try { body = await request.json(); } catch {
        return respond({ error: 'bad_request' }, 400);
      }

      if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 500) {
        return respond({ error: 'bad_request' }, 400);
      }
      const prompt = body.prompt.trim().slice(0, 300);

      const result = await callHFImage(prompt, env);

      if (result.error) return respond({ error: result.error }, 502);

      return new Response(result.bytes, {
        status: 200,
        headers: {
          ...CORS,
          'Content-Type': result.contentType,
          'Cache-Control': 'no-store',
        },
      });
    }

    return respond({ error: 'not_found' }, 404);
  },
};
