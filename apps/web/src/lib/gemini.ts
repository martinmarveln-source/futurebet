/**
 * Shared Gemini REST API client helper supporting Gemini 4 Hydrogen
 * (`thinkingConfig.thinkingLevel`) as well as the current Gemini Flash stack.
 */

export const GEMINI_HYDROGEN_MODELS = [
  "gemini-4-hydrogen",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-1.5-flash",
] as const;

export const GEMINI_CURRENT_BOT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
] as const;

export type GeminiThinkingLevel = "LOW" | "MEDIUM" | "HIGH" | "XHIGH";

export interface GeminiContentMessage {
  role?: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface CallGeminiOptions {
  apiKey: string;
  models: readonly string[];
  systemPrompt: string;
  contents: GeminiContentMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  thinkingLevel?: GeminiThinkingLevel;
  responseMimeType?: "text/plain" | "application/json";
  timeoutMs?: number;
}

export interface CallGeminiResult {
  ok: boolean;
  text: string;
  modelUsed: string | null;
  errors: Array<{ model: string; status?: number; message: string }>;
}

export async function callGemini(options: CallGeminiOptions): Promise<CallGeminiResult> {
  const {
    apiKey,
    models,
    systemPrompt,
    contents,
    temperature = 0.2,
    maxOutputTokens = 8192,
    thinkingLevel = "MEDIUM",
    responseMimeType,
    timeoutMs = 35000,
  } = options;

  const errors: Array<{ model: string; status?: number; message: string }> = [];

  if (!apiKey) {
    return {
      ok: false,
      text: "",
      modelUsed: null,
      errors: [{ model: "none", message: "GEMINI_API_KEY is not configured" }],
    };
  }

  for (const modelName of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens,
      };

      if (modelName.startsWith("gemini-4-")) {
        // Gemini 4 Hydrogen uses thinking tokens inside maxOutputTokens and expects thinkingLevel
        generationConfig.thinkingConfig = { thinkingLevel };
        generationConfig.maxOutputTokens = Math.max(8192, maxOutputTokens);
        generationConfig.temperature = temperature;
      } else {
        generationConfig.temperature = temperature;
      }

      if (responseMimeType) {
        generationConfig.responseMimeType = responseMimeType;
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig,
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        errors.push({
          model: modelName,
          status: res.status,
          message: errBody.slice(0, 300) || `HTTP ${res.status}`,
        });
        continue;
      }

      const data = await res.json();
      const parts: Array<{ text?: string; thought?: boolean }> =
        data?.candidates?.[0]?.content?.parts || [];
      // Filter out internal thought parts if returned separately; concatenate final answer text
      const text = parts
        .filter((p) => !p?.thought && typeof p?.text === "string")
        .map((p) => p.text)
        .join("")
        .trim();

      if (text) {
        return { ok: true, text, modelUsed: modelName, errors };
      }

      errors.push({
        model: modelName,
        status: res.status,
        message: "Empty text candidate returned by model",
      });
    } catch (err: any) {
      errors.push({
        model: modelName,
        message: err?.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : err?.message || "Request error",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, text: "", modelUsed: null, errors };
}

/**
 * Normalize raw betslip leg market/option so values like ("Away Win", "Home Win")
 * or ("Over 2.5", "Over 2.5") render cleanly without contradictory labels.
 */
export function normalizeLegMarketOption(matchObj: any): { market: string; option: string } {
  const rawMkt = String(matchObj?.selectedMarket || "").trim();
  const rawOpt = String(matchObj?.selectedOption || "").trim();
  const guide = String(matchObj?.guide || matchObj?.pick || "").trim();

  const mLower = rawMkt.toLowerCase();
  const oLower = rawOpt.toLowerCase();

  // Fix corrupted cases where selectedMarket actually contains an option (e.g. "Away Win" paired with "Home Win")
  if (["home win", "away win", "draw", "1", "2", "x"].includes(mLower)) {
    const cleanOpt =
      oLower && !["pick", ""].includes(oLower) && mLower === oLower
        ? rawOpt
        : mLower === "1"
        ? "Home Win"
        : mLower === "2"
        ? "Away Win"
        : mLower === "x"
        ? "Draw"
        : rawMkt;
    return { market: "1X2", option: cleanOpt };
  }

  if (["1x", "x2", "12", "home or draw", "draw or away", "home or away"].includes(mLower)) {
    return { market: "Double Chance", option: rawOpt || rawMkt };
  }

  if (["gg", "ng", "btts yes", "btts no"].includes(mLower)) {
    const opt = mLower.includes("ng") || mLower.includes("no") ? "No" : "Yes";
    return { market: "BTTS", option: rawOpt || opt };
  }

  if (/^(over|under)\s+\d/i.test(rawMkt)) {
    return { market: `O/U ${rawMkt.match(/\d+(\.\d+)?/)?.[0] || "2.5"}`, option: rawOpt && rawOpt.toLowerCase() !== "yes" ? rawOpt : rawMkt };
  }

  if (rawMkt && rawOpt) {
    return { market: rawMkt, option: rawOpt };
  }

  // Infer from system guide / recommended
  if (matchObj?.recommended?.market && matchObj?.recommended?.option) {
    return {
      market: String(matchObj.recommended.market),
      option: String(matchObj.recommended.option),
    };
  }

  const gLower = guide.toLowerCase();
  if (gLower === "1" || gLower.includes("home win")) return { market: "1X2", option: "Home Win" };
  if (gLower === "2" || gLower.includes("away win")) return { market: "1X2", option: "Away Win" };
  if (gLower === "x" || gLower === "draw") return { market: "1X2", option: "Draw" };
  if (gLower === "gg" || gLower === "btts") return { market: "BTTS", option: "Yes" };
  if (gLower === "ng") return { market: "BTTS", option: "No" };
  if (gLower.includes("ov") || gLower.includes("over")) {
    const line = gLower.match(/(\d+(?:\.\d+)?)/)?.[1] || "2.5";
    return { market: `O/U ${line}`, option: `Over ${line}` };
  }
  if (gLower.includes("un") || gLower.includes("under")) {
    const line = gLower.match(/(\d+(?:\.\d+)?)/)?.[1] || "2.5";
    return { market: `O/U ${line}`, option: `Under ${line}` };
  }

  return {
    market: rawMkt || "1X2",
    option: rawOpt || guide || "Selection",
  };
}
