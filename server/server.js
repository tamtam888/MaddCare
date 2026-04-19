import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// ── Global safety net ─────────────────────────────────────────────────────────
// Prevents the process from crashing on unhandled async errors.
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
});

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

// CORS: restrict to ALLOWED_ORIGIN in production; open in dev when not set.
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));

app.use(express.json({ limit: "1mb" }));

// ── Helpers ───────────────────────────────────────────────────────────────────
function requireApiKey(res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[server] OPENAI_API_KEY is not set");
    res.status(500).json({ error: "AI service is not configured on the server." });
    return null;
  }
  return apiKey;
}

function buildChatPayload({ model, system, user, temperature = 0.3, max_tokens = 1200 }) {
  return {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens,
  };
}

/**
 * Calls the OpenAI chat completions API with a configurable timeout.
 * Throws on non-2xx responses, empty content, or timeout.
 */
async function callOpenAI({ apiKey, payload, timeoutMs = 20_000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    if (fetchErr.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${timeoutMs / 1000}s`);
    }
    throw fetchErr;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(`[server] OpenAI API error ${response.status}:`, errText.slice(0, 300));
    throw new Error(`OpenAI returned ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  const json = await response.json();
  const content = String(json?.choices?.[0]?.message?.content || "").trim();
  if (!content) throw new Error("OpenAI returned an empty response");
  return content;
}

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.round(x)));
}

function normalizeKpi(kpi, context) {
  const selectedCount = Number(context?.selectedCount || 0);
  const totalHistoryCount = Number(context?.totalHistoryCount || 0);

  const k = kpi && typeof kpi === "object" ? kpi : {};

  const goals = k.goals && typeof k.goals === "object" ? k.goals : {};
  const totalGoals   = clampInt(goals.total       ?? 0, 0, 999);
  const achieved     = clampInt(goals.achieved     ?? 0, 0, 999);
  const inProgress   = clampInt(goals.inProgress   ?? 0, 0, 999);
  const notAchieved  = clampInt(goals.notAchieved  ?? 0, 0, 999);

  const sessionsSelected = clampInt(k.sessionsSelected ?? selectedCount,      0, 9999);
  const sessionsTotal    = clampInt(k.sessionsTotal    ?? totalHistoryCount,   0, 9999);

  const functionalProgressScore = clampInt(k.functionalProgressScore ?? 5, 0, 10);
  const trendRaw = String(k.overallTrend || "").trim();
  const overallTrend =
    trendRaw === "Improving" || trendRaw === "Stable" || trendRaw === "Declining"
      ? trendRaw
      : "Stable";

  const reportingPeriod = String(k.reportingPeriod || "").trim();

  return {
    reportingPeriod,
    sessionsSelected,
    sessionsTotal,
    goals: { total: totalGoals, achieved, inProgress, notAchieved },
    functionalProgressScore,
    overallTrend,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** Health check — lets the front-end verify the AI server is reachable. */
app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  res.json({
    ok: true,
    ai: hasKey ? "configured" : "missing_api_key",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  });
});

app.post("/api/ai/treatment-report", async (req, res) => {
  try {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const visits = Array.isArray(req.body?.visits) ? req.body.visits : [];
    if (!visits.length) {
      return res.status(400).json({ error: "Missing visits" });
    }

    const carePlan =
      req.body?.carePlan && typeof req.body.carePlan === "object"
        ? req.body.carePlan
        : null;

    const safeVisits = visits.slice(0, 30).map((v) => ({
      visitNo:  Number(v?.visitNo || 0),
      type:     String(v?.type    || "other").slice(0, 40),
      date:     String(v?.date    || "").slice(0, 20),
      title:    String(v?.title   || "").slice(0, 160),
      summary:  String(v?.summary || "").slice(0, 2200),
      hasAudio: Boolean(v?.hasAudio),
    }));

    const safeCarePlan = carePlan
      ? {
          goals: Array.isArray(carePlan?.goals)
            ? carePlan.goals
                .map((g) => ({
                  title:  String(g?.title  || "").slice(0, 180),
                  status: String(g?.status || "").slice(0, 60),
                  target: String(g?.target || "").slice(0, 40),
                  notes:  String(g?.notes  || "").slice(0, 500),
                }))
                .slice(0, 30)
            : [],
          exercises: Array.isArray(carePlan?.exercises)
            ? carePlan.exercises
                .map((ex) => ({
                  name:         String(ex?.name         || "").slice(0, 160),
                  instructions: String(ex?.instructions || "").slice(0, 700),
                  dosage:       String(ex?.dosage       || "").slice(0, 120),
                }))
                .slice(0, 60)
            : [],
        }
      : null;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = [
      "You write physical therapy clinical reports.",
      "Return ONLY valid JSON. No markdown. No code fences.",
      "Language: English only.",
      "Do not include any patient identifying details.",
      "Do not invent personal information.",
      "Use only the provided input.",
      "If information is missing, write 'Not specified'.",
      "",
      "Output JSON shape exactly:",
      "{",
      '  "kpi": {',
      '    "reportingPeriod": "string",',
      '    "sessionsSelected": number,',
      '    "sessionsTotal": number,',
      '    "goals": { "total": number, "achieved": number, "inProgress": number, "notAchieved": number },',
      '    "functionalProgressScore": number,',
      '    "overallTrend": "Improving|Stable|Declining"',
      "  },",
      '  "reportText": "string"',
      "}",
      "",
      "KPI rules:",
      "- functionalProgressScore must be 0-10 (integer).",
      "- overallTrend must be one of: Improving, Stable, Declining.",
      "- Goals should be functional when possible.",
    ].join("\n");

    const user = [
      "Create a structured treatment report based on selected visits.",
      "Include these sections in reportText with clear headings:",
      "1) Reason for treatment / Primary complaint",
      "2) Treatment goals (functional, measurable when possible)",
      "3) Interventions performed (include exercises if mentioned)",
      "4) Progress and response to treatment (strengths, difficulties)",
      "5) Goal attainment status (achieved / in progress / not achieved)",
      "6) Risks / red flags (if any; otherwise 'None noted')",
      "7) Plan and recommendations for next sessions",
      "",
      "Also produce KPI summary in 'kpi'.",
      "If care plan goals exist, align goals and statuses with them.",
      "",
      "Care plan context JSON (may be null):",
      JSON.stringify(safeCarePlan, null, 2),
      "",
      "Selected visits JSON:",
      JSON.stringify(safeVisits, null, 2),
    ].join("\n");

    const payload = buildChatPayload({ model, system, user, temperature: 0.2, max_tokens: 1400 });
    const raw = await callOpenAI({ apiKey, payload });

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== "object") {
      return res.json({
        kpi: normalizeKpi(null, { selectedCount: safeVisits.length, totalHistoryCount: 0 }),
        reportText: String(raw || "").trim(),
      });
    }

    const reportText = String(parsed?.reportText || "").trim();
    const kpi = normalizeKpi(parsed?.kpi, {
      selectedCount: safeVisits.length,
      totalHistoryCount: Number(req.body?.totalHistoryCount || 0),
    });

    return res.json({ kpi, reportText: reportText || "Not specified." });
  } catch (err) {
    console.error("[server] /api/ai/treatment-report error:", err?.message || err);
    return res.status(500).json({ error: "Failed to generate report. Please try again." });
  }
});

app.post("/api/ai/improve-visit", async (req, res) => {
  try {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const input = String(req.body?.text || "").trim();
    if (!input) {
      return res.status(400).json({ error: "Missing text" });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = [
      "You improve clinical visit summaries written by a clinician.",
      "Language: English only.",
      "Preserve meaning. Do not add invented facts.",
      "Return a professional, clear, structured note.",
      "Use headings if helpful.",
    ].join(" ");

    const user = [
      "Rewrite the following visit summary to be more professional and clear.",
      "Do not add new clinical facts.",
      "",
      "Text:",
      input,
    ].join("\n");

    const payload = buildChatPayload({ model, system, user, temperature: 0.2, max_tokens: 700 });
    const improved = await callOpenAI({ apiKey, payload });

    return res.json({ text: improved });
  } catch (err) {
    console.error("[server] /api/ai/improve-visit error:", err?.message || err);
    return res.status(500).json({ error: "Failed to improve text. Please try again." });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  const origin = allowedOrigin === "*" ? "all origins (dev)" : allowedOrigin;
  console.log(`[server] AI proxy listening on port ${port} | CORS: ${origin}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[server] WARNING: OPENAI_API_KEY is not set — AI routes will return errors");
  }
});
