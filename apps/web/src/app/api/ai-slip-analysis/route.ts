import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  callGemini,
  GEMINI_HYDROGEN_MODELS,
  normalizeLegMarketOption,
} from "@/lib/gemini";

interface LegQuantMetrics {
  legIndex: number;
  match: string;
  league: string;
  market: string;
  option: string;
  odds: number;
  impliedProbPct: number;
  modelProbPct: number;
  fairOdds: number | null;
  edgePct: number | null;
  combinedAvgGoals: number;
  status: "STRONG" | "CAUTION" | "RISKY";
  headline: string;
  dataCitation: string;
  saferAlternative?: {
    label: string;
    market: string;
    option: string;
    odds?: number;
  } | null;
}

function toPct(val: any): number | null {
  const n = Number(String(val ?? "").replace("%", "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function resolveModelProbForMarket(m: any, market: string, option: string): number {
  const mkt = market.toLowerCase();
  const opt = option.toLowerCase();

  const hw = toPct(m.homeWin) ?? 0;
  const dr = toPct(m.draw) ?? 0;
  const aw = toPct(m.awayWin) ?? 0;
  const gg = toPct(m.gg) ?? 0;
  const ng = toPct(m.ng) ?? (gg > 0 ? 100 - gg : 0);
  const ov25 = toPct(m.ov25) ?? 0;
  const un25 = toPct(m.un25) ?? (ov25 > 0 ? 100 - ov25 : 0);

  if (mkt.includes("double") || opt.includes("1x") || opt.includes("x2") || opt.includes("12")) {
    if ((opt.includes("1x") || opt.includes("home or draw")) && hw + dr > 0) return Math.min(95, hw + dr);
    if ((opt.includes("x2") || opt.includes("away") || opt.includes("draw or away")) && aw + dr > 0) return Math.min(95, aw + dr);
    if ((opt.includes("12") || (opt.includes("home") && opt.includes("away"))) && hw + aw > 0) return Math.min(95, hw + aw);
  }
  if (mkt.includes("btts") || mkt.includes("both")) {
    if (opt.includes("no") && ng > 0) return ng;
    if (gg > 0) return gg;
  }
  if (mkt.includes("2.5") || opt.includes("2.5")) {
    if (opt.includes("under") && un25 > 0) return un25;
    if (ov25 > 0) return ov25;
  }
  if ((mkt.includes("1.5") || opt.includes("1.5")) && ov25 > 0) {
    return opt.includes("over") ? Math.min(92, Math.round(ov25 + 22)) : Math.max(15, Math.round(100 - (ov25 + 22)));
  }
  if (mkt.includes("1x2") || mkt.includes("result")) {
    if (opt.includes("home") && hw > 0) return hw;
    if (opt.includes("away") && aw > 0) return aw;
    if (opt.includes("draw") && dr > 0) return dr;
  }

  return toPct(m.chance) ?? 55;
}

function buildDeterministicAudit(matches: any[], teamStatsMap: Map<string, any>) {
  const seenTeams = new Map<string, number[]>();
  const leagueMap = new Map<string, number>();

  const legs: LegQuantMetrics[] = matches.map((m, idx) => {
    const { market, option } = normalizeLegMarketOption(m);
    const odds = Number(m.odds) > 1.01 ? Number(m.odds) : Number(m.homeOdds) || 1.8;
    const impliedProbPct = Math.round((1 / odds) * 100);
    const modelProbPct = resolveModelProbForMarket(m, market, option);
    const fairOdds = modelProbPct > 0 ? Number((100 / modelProbPct).toFixed(2)) : null;
    const edgePct = modelProbPct > 0 ? Number((((modelProbPct / 100) * odds - 1) * 100).toFixed(1)) : null;

    const parts = String(m.match || "").split(/\s+vs\s+|\s+-\s+/);
    const homeTeam = (parts[0] || "Home").trim();
    const awayTeam = (parts[1] || "Away").trim();
    const hKey = homeTeam.toLowerCase();
    const aKey = awayTeam.toLowerCase();
    if (hKey) seenTeams.set(hKey, [...(seenTeams.get(hKey) || []), idx + 1]);
    if (aKey) seenTeams.set(aKey, [...(seenTeams.get(aKey) || []), idx + 1]);

    const leagueName = String(m.league || "Unknown");
    leagueMap.set(leagueName, (leagueMap.get(leagueName) || 0) + 1);

    const hgs = Number(m.hgs) || 0;
    const hgc = Number(m.hgc) || 0;
    const ags = Number(m.ags) || 0;
    const agc = Number(m.agc) || 0;
    const combinedAvgGoals = Number(m.avg) || Number(((hgs + hgc + ags + agc) / 2).toFixed(2)) || 0;

    const hOv2 = toPct(m.hOv2);
    const aOv2 = toPct(m.aOv2);
    const hBtts = toPct(m.hBtts);
    const aBtts = toPct(m.aBtts);
    const h2hOv = toPct(m.H2H_OV);
    const h2hGg = toPct(m.H2H_GG);
    const rating = toPct(m.rating) ?? 0;
    const hPts = Number(m.hPts) || 0;
    const aPts = Number(m.aPts) || 0;

    const hs = teamStatsMap.get(hKey) || {};
    const as_ = teamStatsMap.get(aKey) || {};

    const reasons: string[] = [];
    const positives: string[] = [];
    let riskLevel: "STRONG" | "CAUTION" | "RISKY" = "STRONG";
    let saferAlternative: LegQuantMetrics["saferAlternative"] = null;

    const mLower = `${market} ${option}`.toLowerCase();

    // Check negative value / probability vs high odds
    if (edgePct !== null && edgePct < -8) {
      reasons.push(`Negative value edge (${edgePct}%) — market @ ${odds.toFixed(2)} implies ${impliedProbPct}% vs ${modelProbPct}% model prob.`);
      riskLevel = "CAUTION";
    } else if (edgePct !== null && edgePct >= 4) {
      positives.push(`+${edgePct}% EV edge (Fair odds ${fairOdds?.toFixed(2)} vs book ${odds.toFixed(2)}).`);
    }

    // Check 1X2 outright risks
    if (mLower.includes("home win") && !mLower.includes("draw")) {
      if (aPts > hPts + 3) {
        reasons.push(`${awayTeam} holds stronger recent form (${aPts}pts vs ${hPts}pts for ${homeTeam}).`);
        riskLevel = "RISKY";
      } else if (modelProbPct < 52) {
        reasons.push(`Home Win probability (${modelProbPct}%) leaves narrow margin against an upset or draw (${toPct(m.draw) ?? 25}%).`);
        if (riskLevel === "STRONG") riskLevel = "CAUTION";
      } else {
        positives.push(`${homeTeam} carries ${modelProbPct}% win probability (${hPts} vs ${aPts} recent pts).`);
      }
      if (riskLevel !== "STRONG" && Number(m.dc1X) > 1.05) {
        saferAlternative = { label: `Double Chance 1X @ ${Number(m.dc1X).toFixed(2)}`, market: "Double Chance", option: "Home Win or Draw", odds: Number(m.dc1X) };
      }
    } else if (mLower.includes("away win") && !mLower.includes("draw")) {
      if (hPts > aPts + 3) {
        reasons.push(`${homeTeam} leads form table (${hPts}pts vs ${aPts}pts) — backing away win straight carries upset danger.`);
        riskLevel = "RISKY";
      } else if (modelProbPct < 50) {
        reasons.push(`Away Win win-prob is ${modelProbPct}% with ${toPct(m.draw) ?? 25}% draw risk.`);
        if (riskLevel === "STRONG") riskLevel = "CAUTION";
      } else {
        positives.push(`${awayTeam} holds ${modelProbPct}% away win prob (${aPts} recent pts).`);
      }
      if (riskLevel !== "STRONG" && Number(m.dcX2) > 1.05) {
        saferAlternative = { label: `Double Chance X2 @ ${Number(m.dcX2).toFixed(2)}`, market: "Double Chance", option: "Draw or Away Win", odds: Number(m.dcX2) };
      }
    } else if (mLower.includes("over 2.5")) {
      if (combinedAvgGoals > 0 && combinedAvgGoals < 2.1) {
        reasons.push(`Low combined scoring pace (${combinedAvgGoals.toFixed(2)} goals/g) contradicts Over 2.5.`);
        riskLevel = "RISKY";
      } else if (hOv2 !== null && aOv2 !== null && hOv2 < 45 && aOv2 < 45) {
        reasons.push(`Both sides have weak O2.5 hit rates (${hOv2}% / ${aOv2}%).`);
        riskLevel = "CAUTION";
      } else {
        positives.push(`Attack/concede pace (${combinedAvgGoals.toFixed(2)} g/g) and O2.5 model (${modelProbPct}%) support goals.`);
      }
      if (riskLevel !== "STRONG" && Number(m.o15Odds) > 1.05) {
        saferAlternative = { label: `Over 1.5 Goals @ ${Number(m.o15Odds).toFixed(2)}`, market: "O/U 1.5", option: "Over 1.5", odds: Number(m.o15Odds) };
      }
    } else if (mLower.includes("under 2.5")) {
      if (combinedAvgGoals > 2.85 || ((hBtts ?? 0) > 62 && (aBtts ?? 0) > 62)) {
        reasons.push(`High scoring average (${combinedAvgGoals.toFixed(2)} g/g) and BTTS rates (${hBtts ?? "?"}%/${aBtts ?? "?"}%) threaten Under 2.5.`);
        riskLevel = "RISKY";
      } else {
        positives.push(`Contained tempo (${combinedAvgGoals.toFixed(2)} g/g) aligns with Under 2.5 (${modelProbPct}%).`);
      }
      if (riskLevel !== "STRONG" && Number(m.u35Odds) > 1.05) {
        saferAlternative = { label: `Under 3.5 Goals @ ${Number(m.u35Odds).toFixed(2)}`, market: "O/U 3.5", option: "Under 3.5", odds: Number(m.u35Odds) };
      }
    } else if (mLower.includes("btts") && !mLower.includes("no")) {
      if ((hBtts !== null && hBtts < 40) || (aBtts !== null && aBtts < 40)) {
        reasons.push(`BTTS rate dip: ${homeTeam} ${hBtts ?? "?"}% vs ${awayTeam} ${aBtts ?? "?"}% in recent matches.`);
        riskLevel = "CAUTION";
      } else {
        positives.push(`Strong mutual scoring profile (BTTS ${modelProbPct}%, H2H GG ${h2hGg ?? "?"}%).`);
      }
      if (riskLevel !== "STRONG" && Number(m.o15Odds) > 1.05) {
        saferAlternative = { label: `Over 1.5 Goals @ ${Number(m.o15Odds).toFixed(2)}`, market: "O/U 1.5", option: "Over 1.5", odds: Number(m.o15Odds) };
      }
    } else {
      positives.push(`Model prob ${modelProbPct}% (Rating ${rating}%) vs implied ${impliedProbPct}% @ ${odds.toFixed(2)}.`);
    }

    const extraStats = [
      `Scoring avg ${combinedAvgGoals.toFixed(2)} g/g`,
      h2hOv !== null ? `H2H O2.5 ${h2hOv}%` : null,
      hs?.W_ALL ? `Home Lge W ${hs.W_ALL}%` : null,
      as_?.W_ALL ? `Away Lge W ${as_.W_ALL}%` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    return {
      legIndex: idx + 1,
      match: m.match,
      league: leagueName,
      market,
      option,
      odds: Number(odds.toFixed(2)),
      impliedProbPct,
      modelProbPct,
      fairOdds,
      edgePct,
      combinedAvgGoals: Number(combinedAvgGoals.toFixed(2)),
      status: riskLevel,
      headline:
        reasons[0] ||
        positives[0] ||
        `${modelProbPct}% model probability vs ${impliedProbPct}% bookmaker implied`,
      dataCitation: [...reasons, ...positives, extraStats].filter(Boolean).join(" "),
      saferAlternative,
    };
  });

  const correlationAlerts: string[] = [];
  for (const [team, indices] of seenTeams.entries()) {
    if (indices.length > 1) {
      correlationAlerts.push(`Team correlation: "${team}" appears in Legs ${indices.join(" & ")}.`);
    }
  }
  for (const [league, count] of leagueMap.entries()) {
    if (count >= 3 && league !== "Unknown") {
      correlationAlerts.push(`League concentration: ${count} legs come from ${league}.`);
    }
  }

  const riskyCount = legs.filter((l) => l.status === "RISKY").length;
  const cautionCount = legs.filter((l) => l.status === "CAUTION").length;
  const avgModelProb =
    legs.length > 0 ? Math.round(legs.reduce((s, l) => s + l.modelProbPct, 0) / legs.length) : 60;
  const modelSlipProbPct = Number(
    (legs.reduce((p, l) => p * (l.modelProbPct / 100), 1) * 100).toFixed(2)
  );
  const totalOdds = legs.reduce((p, l) => p * l.odds, 1);
  const impliedSlipProbPct = totalOdds > 0 ? Number(((1 / totalOdds) * 100).toFixed(2)) : 0;

  const slipScore = Math.max(
    15,
    Math.min(96, avgModelProb - riskyCount * 14 - cautionCount * 5 - correlationAlerts.length * 6)
  );
  const riskRating: "LOW" | "MODERATE" | "HIGH" =
    riskyCount >= 2 || legs.length >= 10 || correlationAlerts.length >= 2
      ? "HIGH"
      : riskyCount >= 1 || cautionCount >= 2
      ? "MODERATE"
      : "LOW";

  const overallVerdict =
    riskyCount > 0
      ? `Proceed with caution — ${riskyCount} leg(s) carry direct statistical flags.`
      : cautionCount > 0
      ? `Moderate exposure — ${cautionCount} thin margin leg(s); consider safer double-chance/O1.5 covers.`
      : `Solid structural alignment across all ${legs.length} legs.`;

  return {
    overallVerdict,
    riskRating,
    slipScore,
    modelSlipProbPct,
    impliedSlipProbPct,
    summary: `Quantitative audit of ${legs.length} legs (${totalOdds.toFixed(2)}x total odds). Avg leg prob ${avgModelProb}% (${riskyCount} risky, ${cautionCount} caution).`,
    correlationAlerts,
    legs,
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userRecord] = await sql`
      SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1
    `;
    const role = String(userRecord?.user_role || "free").toLowerCase();
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { matches } = await req.json();
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ error: "No matches provided" }, { status: 400 });
    }

    // Fetch league stats for all teams (read-only public football cache)
    const teamStatsMap = new Map<string, any>();
    try {
      const stats = await sql`
        SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL
      `;
      for (const row of stats) {
        if (!row.team || !row.market_stats) continue;
        let ms = row.market_stats;
        if (typeof ms === "string") {
          try {
            ms = JSON.parse(ms);
          } catch {
            ms = {};
          }
        }
        teamStatsMap.set(row.team.trim().toLowerCase(), ms);
      }
    } catch (e) {
      console.warn("Could not fetch team stats:", e);
    }

    const deterministic = buildDeterministicAudit(matches, teamStatsMap);

    const fmt = (val: any, decimals = 0) => {
      if (val === null || val === undefined || val === "" || val === "0" || val === 0) return "—";
      const n = Number(val);
      if (isNaN(n)) return String(val);
      return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
    };
    const fmtPct = (val: any) => {
      if (!val || val === "0") return "—";
      const n = Number(String(val).replace("%", ""));
      return isNaN(n) ? "—" : (n <= 1 && n > 0 ? Math.round(n * 100) : Math.round(n)) + "%";
    };
    const fmtOdds = (val: any) => {
      const n = Number(val);
      return n > 1.01 ? n.toFixed(2) : "—";
    };
    const fmtStat = (val: any) => (val ? (String(val).includes("%") ? val : val + "%") : "—");

    const slipData = matches
      .map((m: any, i: number) => {
        const legMetric = deterministic.legs[i];
        const parts = String(m.match || "").split(/\s+vs\s+|\s+-\s+/);
        const homeTeam = (parts[0] || "Unknown").trim();
        const awayTeam = (parts[1] || "Unknown").trim();

        const homeStats = teamStatsMap.get(homeTeam.toLowerCase()) || {};
        const awayStats = teamStatsMap.get(awayTeam.toLowerCase()) || {};

        return `Leg ${i + 1}: ${m.match} [${legMetric.market} → ${legMetric.option} @ ${legMetric.odds}]
  Quant Edge: Model Prob ${legMetric.modelProbPct}% (Fair Odds ${legMetric.fairOdds ?? "—"}) vs Implied ${legMetric.impliedProbPct}% | EV Edge: ${legMetric.edgePct ?? "—"}% | System Rating ${fmtPct(m.rating)}
  Win Probs → Home: ${fmtPct(m.homeWin)} | Draw: ${fmtPct(m.draw)} | Away: ${fmtPct(m.awayWin)} | DC1X:${fmtOdds(m.dc1X)} DC12:${fmtOdds(m.dc12)} DCX2:${fmtOdds(m.dcX2)}
  Goals Avg → Home: scores ${fmt(m.hgs, 1)}/g, concedes ${fmt(m.hgc, 1)}/g | Away: scores ${fmt(m.ags, 1)}/g, concedes ${fmt(m.agc, 1)}/g | Combined Avg: ${legMetric.combinedAvgGoals} g/g
  Form & Season → Home: ${m.hForm || "—"} (${fmt(m.hPts)}pts, W${fmt(m.hWin)}/D${fmt(m.hDraw)}/L${fmt(m.hLost)}) | Away: ${m.aForm || "—"} (${fmt(m.aPts)}pts, W${fmt(m.aWin)}/D${fmt(m.aDraw)}/L${fmt(m.aLost)})
  Goal/BTTS Rates → Home BTTS:${fmtPct(m.hBtts)} O2.5:${fmtPct(m.hOv2)} | Away BTTS:${fmtPct(m.aBtts)} O2.5:${fmtPct(m.aOv2)} | O1.5:${fmtPct(m.ov15)} O2.5:${fmtPct(m.ov25)} O3.5:${fmtPct(m.ov35)}
  H2H (${fmt(m.H2H_GP) || "?"}g) → Home W:${fmt(m.H2H_H)} D:${fmt(m.H2H_D)} Away:${fmt(m.H2H_A)} | O2.5:${fmtPct(m.H2H_OV)} | BTTS:${fmtPct(m.H2H_GG)} | Likely CS: ${m.likelyCS || "—"}
  Available Odds → Home:${fmtOdds(m.homeOdds)} Draw:${fmtOdds(m.drawOdds)} Away:${fmtOdds(m.awayOdds)} O1.5:${fmtOdds(m.o15Odds)} O2.5:${fmtOdds(m.o25Odds)} O3.5:${fmtOdds(m.o35Odds)} U3.5:${fmtOdds(m.u35Odds)} BTTS-Y:${fmtOdds(m.bttsYesOdds)} BTTS-N:${fmtOdds(m.bttsNoOdds)} DC1X:${fmtOdds(m.dc1X)} DC12:${fmtOdds(m.dc12)} DCX2:${fmtOdds(m.dcX2)}
  League Split → Home[W:${fmtStat(homeStats.W_ALL || homeStats.W_HOME)} O2.5:${fmtStat(homeStats.O25_ALL || homeStats.O25_HOME)} BTTS:${fmtStat(homeStats.BTTS_ALL || homeStats.BTTS_HOME)}] | Away[W:${fmtStat(awayStats.W_ALL || awayStats.W_AWAY)} O2.5:${fmtStat(awayStats.O25_ALL || awayStats.O25_AWAY)} BTTS:${fmtStat(awayStats.BTTS_ALL || awayStats.BTTS_AWAY)}]`;
      })
      .join("\n\n");

    const systemPrompt = `You are an elite quantitative football syndicate risk auditor powered by Gemini 4 Hydrogen.
Audit every single leg rigorously using ONLY the exact numbers provided in the prompt. Never fabricate numbers or generic filler.

For EACH leg:
- Compare Model Probability & Fair Odds vs Bookmaker Odds (EV Edge).
- Cross-check goals/game, BTTS rates, H2H, form points, and clean-sheet vs market line.
- Assign "STRONG" (clear statistical backing), "CAUTION" (thin margin / negative EV / mixed indicators), or "RISKY" (direct statistical contradiction).
- If status is "CAUTION" or "RISKY", provide a concrete "saferAlternative" using an ACTUAL market and odds from "Available Odds" (or null if none helps).

Return STRICT JSON matching this exact schema (no markdown wrapping):
{
  "overallVerdict": "Concise 1-sentence executive decision (mention exact leg numbers to review if any)",
  "riskRating": "LOW" | "MODERATE" | "HIGH",
  "slipScore": 0-100,
  "summary": "2-3 sentence quantitative portfolio overview citing accumulator variance, strongest anchor legs, and weakest links",
  "correlationAlerts": ["Only if same team repeats or >=3 legs from one league or conflicting parlays"],
  "legs": [
    {
      "legIndex": 1,
      "status": "STRONG" | "CAUTION" | "RISKY",
      "headline": "Short sharp 8-14 word finding",
      "dataCitation": "2 concise sentences quoting exact stats (e.g. goals/g, BTTS %, H2H, form pts, edge %)",
      "saferAlternative": {
        "label": "Double Chance 1X @ 1.32",
        "market": "Double Chance",
        "option": "Home Win or Draw",
        "odds": 1.32
      }
    }
  ]
}`;

    const userPrompt = `Audit this ${matches.length}-leg betslip thoroughly (${deterministic.impliedSlipProbPct}% book implied slip prob, ${deterministic.modelSlipProbPct}% model joint prob):\n\n${slipData}`;

    const apiKey = process.env.GEMINI_API_KEY || "";
    let structured = deterministic;
    let modelUsed = "deterministic-fallback";
    let aiErrors: any[] = [];

    if (apiKey) {
      const aiRes = await callGemini({
        apiKey,
        models: GEMINI_HYDROGEN_MODELS,
        systemPrompt,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        temperature: 0.15,
        maxOutputTokens: 8192,
        thinkingLevel: "MEDIUM",
        responseMimeType: "application/json",
      });

      aiErrors = aiRes.errors;
      if (aiRes.ok && aiRes.text) {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            const mergedLegs: LegQuantMetrics[] = deterministic.legs.map((baseLeg) => {
              const aiLeg = Array.isArray(parsed.legs)
                ? parsed.legs.find((l: any) => Number(l.legIndex) === baseLeg.legIndex)
                : null;
              if (!aiLeg) return baseLeg;
              const status = ["STRONG", "CAUTION", "RISKY"].includes(String(aiLeg.status || "").toUpperCase())
                ? (String(aiLeg.status).toUpperCase() as "STRONG" | "CAUTION" | "RISKY")
                : baseLeg.status;
              return {
                ...baseLeg,
                status,
                headline: String(aiLeg.headline || baseLeg.headline),
                dataCitation: String(aiLeg.dataCitation || baseLeg.dataCitation),
                saferAlternative:
                  aiLeg.saferAlternative && aiLeg.saferAlternative.market && aiLeg.saferAlternative.option
                    ? {
                        label: String(aiLeg.saferAlternative.label || `${aiLeg.saferAlternative.market}: ${aiLeg.saferAlternative.option}`),
                        market: String(aiLeg.saferAlternative.market),
                        option: String(aiLeg.saferAlternative.option),
                        odds: Number(aiLeg.saferAlternative.odds) || undefined,
                      }
                    : status === "STRONG"
                    ? null
                    : baseLeg.saferAlternative,
              };
            });

            structured = {
              overallVerdict: String(parsed.overallVerdict || deterministic.overallVerdict),
              riskRating: ["LOW", "MODERATE", "HIGH"].includes(String(parsed.riskRating || "").toUpperCase())
                ? (String(parsed.riskRating).toUpperCase() as "LOW" | "MODERATE" | "HIGH")
                : deterministic.riskRating,
              slipScore:
                Number.isFinite(Number(parsed.slipScore))
                  ? Math.max(0, Math.min(100, Math.round(Number(parsed.slipScore))))
                  : deterministic.slipScore,
              modelSlipProbPct: deterministic.modelSlipProbPct,
              impliedSlipProbPct: deterministic.impliedSlipProbPct,
              summary: String(parsed.summary || deterministic.summary),
              correlationAlerts:
                Array.isArray(parsed.correlationAlerts) && parsed.correlationAlerts.length > 0
                  ? parsed.correlationAlerts.map(String)
                  : deterministic.correlationAlerts,
              legs: mergedLegs,
            };
            modelUsed = aiRes.modelUsed || "gemini-4-hydrogen";
          } catch (parseErr) {
            console.warn("Failed to parse Gemini risk audit JSON, using enhanced deterministic audit:", parseErr);
          }
        }
      } else if (aiErrors.length > 0) {
        console.warn("Gemini slip analysis model attempts:", aiErrors);
      }
    }

    // Build crisp formatted text summary for legacy/copy-paste compatibility
    const formattedLines: string[] = [];
    formattedLines.push(`**Overall Verdict (${structured.riskRating} Risk • Score ${structured.slipScore}/100):** ${structured.overallVerdict}`);
    formattedLines.push(structured.summary);
    for (const leg of structured.legs) {
      const badge = leg.status === "RISKY" ? "⚠️ RISKY" : leg.status === "CAUTION" ? "🟡 CAUTION" : "✅ STRONG";
      formattedLines.push(
        `${badge} **Leg ${leg.legIndex} (${leg.match}) — ${leg.market}: ${leg.option} @ ${leg.odds.toFixed(2)}**\n${leg.headline}. ${leg.dataCitation}${leg.saferAlternative ? ` Safer option: ${leg.saferAlternative.label}.` : ""}`
      );
    }
    if (structured.correlationAlerts.length > 0) {
      formattedLines.push(`🔗 **Correlation Warnings:** ${structured.correlationAlerts.join(" ")}`);
    }

    return NextResponse.json({
      analysis: formattedLines.join("\n\n"),
      structured,
      modelUsed,
    });
  } catch (error) {
    console.error("AI Slip Analysis Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
