// @ts-nocheck
export function bestPickFromMatch(m, style = "balanced") {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // Raw probs from your sheet
  const pHome = n(m?.homeWin);
  const pDraw = n(m?.draw);
  const pAway = n(m?.awayWin);

  const pOv25 = n(m?.ov25);
  const pUn25 = n(m?.un25);

  const pGG = n(m?.gg);
  const pNG = n(m?.ng);

  // Derived Double Chance (from 1X2)
  const pHD = pHome + pDraw; // Home or Draw
  const pHA = pHome + pAway; // Home or Away
  const pDA = pDraw + pAway; // Draw or Away

  // Build candidate options we support in your slip
  const candidates = [
    { market: "1X2", option: "Home", prob: pHome },
    { market: "1X2", option: "Draw", prob: pDraw },
    { market: "1X2", option: "Away", prob: pAway },

    { market: "Over 2.5", option: "Yes", prob: pOv25 },
    { market: "Over 2.5", option: "No", prob: pUn25 },

    { market: "BTTS", option: "Yes", prob: pGG },
    { market: "BTTS", option: "No", prob: pNG },

    // Optional but great for SAFE:
    { market: "Double Chance", option: "Home or Draw", prob: pHD },
    { market: "Double Chance", option: "Home or Away", prob: pHA },
    { market: "Double Chance", option: "Draw or Away", prob: pDA },
  ]
    .filter((x) => x.prob > 0 && x.prob <= 100)
    .map((x) => ({ ...x, score: x.prob })); // base scoring

  // Style tuning (small biases)
  for (const c of candidates) {
    if (style === "safe") {
      // Avoid volatile markets a bit
      if (c.market === "1X2" && c.option === "Draw") c.score *= 0.85; // penalize Draw
      if (c.market === "BTTS") c.score *= 0.92; // small penalty
      if (c.market === "Over 2.5") c.score *= 0.95; // small penalty

      // Prefer Double Chance for safety
      if (c.market === "Double Chance") c.score *= 1.05;
    }

    if (style === "edge") {
      // Slightly prefer markets that usually pay better than double chance
      if (c.market === "1X2" && c.option !== "Draw") c.score *= 1.02;
      if (c.market === "Over 2.5") c.score *= 1.01;
      if (c.market === "BTTS") c.score *= 1.01;

      // De-prioritize Double Chance in Edge mode
      if (c.market === "Double Chance") c.score *= 0.95;
    }

    // balanced = do nothing (pure highest probability)
  }

  // Pick highest score
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return { selectedMarket: "1X2", selectedOption: "Draw" }; // fallback

  return {
    selectedMarket: best.market,
    selectedOption: best.option,
    bestProb: best.prob,
  };
}

export function parseTablePos(tableStr, side /* "home" | "away" */) {
  const raw = String(tableStr || "").trim(); // e.g. "7|1"
  const parts = raw.split("|").map((x) => Number(String(x).trim()));
  if (parts.length !== 2) return null;
  const [h, a] = parts;
  const v = side === "away" ? a : h;
  return Number.isFinite(v) ? v : null;
}

export function isLowTierGroup(g) {
  const x = String(g || "")
    .trim()
    .toUpperCase();
  return x === "D" || x === "E";
}

export function clampN(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

export function vipScoreFromMatch(m) {
  const c = Number(m?.chance) || 0;
  const r = Number(m?.rating) || 0;
  return Math.round(c * 0.6 + r * 0.4);
}

export function approxOverProbFromAvg(avgGoals, line) {
  const mu = Number(avgGoals);
  if (!Number.isFinite(mu) || mu <= 0) return 0;

  // P(Over x.5) = 1 - P(<= x)
  const kMax = Math.floor(line);
  let pLE = 0;
  let p = Math.exp(-mu);
  pLE += p; // k=0
  for (let k = 1; k <= kMax; k++) {
    p = (p * mu) / k;
    pLE += p;
  }
  const over = (1 - pLE) * 100;
  return clampN(over, 0, 100);
}

export function marketProb(m, market, option) {
  // Returns % (0..100) or 0 if missing
  if (market === "1X2") {
    if (option === "Home") return Number(m?.homeWin) || 0;
    if (option === "Draw") return Number(m?.draw) || 0;
    if (option === "Away") return Number(m?.awayWin) || 0;
  }

  if (market === "Over 2.5") {
    if (option === "Yes") return Number(m?.ov25) || 0;
    if (option === "No") return Number(m?.un25) || 0;
  }

  if (market === "Over 1.5") {
    const direct = Number(m?.ov15);
    const p =
      Number.isFinite(direct) && direct > 0
        ? direct
        : approxOverProbFromAvg(m?.avg, 1.5);
    if (option === "Yes") return p || 0;
    if (option === "No") return p ? 100 - p : 0;
  }

  if (market === "Over 3.5") {
    const direct = Number(m?.ov35);
    const p =
      Number.isFinite(direct) && direct > 0
        ? direct
        : approxOverProbFromAvg(m?.avg, 3.5);
    if (option === "Yes") return p || 0;
    if (option === "No") return p ? 100 - p : 0;
  }
  if (market === "Over 4.5") {
    const direct = Number(m?.ov45);
    const p =
      Number.isFinite(direct) && direct > 0
        ? direct
        : approxOverProbFromAvg(m?.avg, 4.5);

    if (option === "Yes") return p || 0;
    if (option === "No") return p ? 100 - p : 0;
  }

  if (market === "BTTS") {
    if (option === "Yes") return Number(m?.gg) || 0;
    if (option === "No") return Number(m?.ng) || 0;
  }

  if (market === "Correct Score") {
    // Prefer the provided CS percentages if present
    const p1 = Number(m?.scorelineCSPercent);
    const p2 = Number(m?.modelCSPercent);
    const best = Number.isFinite(p1) ? p1 : Number.isFinite(p2) ? p2 : 0;
    return best > 0 ? best : 0;
  }

  return 0;
}

export function pickCorrectScoreOption(m) {
  // ✅ Prefer C. SCORE, fallback to Likely CS only if C. SCORE missing
  const s = String(m?.cScore || m?.c_score || m?.likelyCS || "").trim();
  if (!s || !s.includes(":")) return "";
  return s.replace(":", "-"); // UI expects "1-0"
}

export function parseRecentScores(text) {
  // "2026-02-07 Newcastle - Brentford 2 : 3,..." -> [[2,3], ...]
  const t = String(text || "");
  const matches = [];
  const re = /(\d+)\s*:\s*(\d+)/g;
  let m;
  while ((m = re.exec(t))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) matches.push([a, b]);
  }
  return matches.slice(0, 6);
}

export function csSupportScore(m, option /* "1-1" */) {
  const want = String(option || "").trim();
  if (!want.includes("-")) return 0;
  const [wh, wa] = want.split("-").map((x) => Number(x));
  if (!Number.isFinite(wh) || !Number.isFinite(wa)) return 0;

  const wantTot = wh + wa;
  const wantBTTS = wh > 0 && wa > 0;

  const H = parseRecentScores(m?.H_Recent);
  const A = parseRecentScores(m?.A_Recent);
  const HH = parseRecentScores(m?.H2H_Recent);

  const score = (arr, weightExact, weightTot, weightBtts) => {
    let s = 0;
    for (const [x, y] of arr) {
      const exact = x === wh && y === wa;
      const tot = x + y === wantTot;
      const btts = x > 0 && y > 0;
      if (exact) s += weightExact;
      else {
        if (tot) s += weightTot;
        if (btts === wantBTTS) s += weightBtts;
      }
    }
    return s;
  };

  // weights tuned for stability
  const recentScore = score([...H, ...A], 3, 2, 1);
  const h2hScore = score(HH, 4, 2, 1);

  // Cap so it doesn't explode
  return clamp(recentScore + h2hScore, 0, 20);
}

export function thresholdsByStyle(style) {
  if (style === "safe") {
    return {
      ou: 68,
      btts: 70,
      oneX2: 62,
      draw: 40,
      cs: 10,
    };
  }
  if (style === "balanced") {
    return {
      ou: 60,
      btts: 60,
      oneX2: 55,
      draw: 33,
      cs: 8,
    };
  }
  // edge
  return {
    ou: 55,
    btts: 55,
    oneX2: 50,
    draw: 28,
    cs: 6.5,
  };
}

export function isBottomTeam(m) {
  // Avoid last-table fights especially for CS/Under
  const hPos = parseTablePos(m?.table, "home");
  const aPos = parseTablePos(m?.table, "away");
  // If league size unknown, use 15+ as "bottom zone" (works well for 18–24 leagues)
  const badH = Number.isFinite(hPos) && hPos >= 15;
  const badA = Number.isFinite(aPos) && aPos >= 15;
  return badH || badA;
}

export function pickBestSelectionForMatch(m, style, prefs) {
  const t = thresholdsByStyle(style);

  const flagOk = String(m?.flag || "") === "✅";
  const chance = Number(m?.chance) || 0;
  const rating = Number(m?.rating) || 0;

  // Style gating (same spirit as your stylePass)
  if (style === "safe" && !(flagOk && chance >= 75 && rating >= 70))
    return null;
  if (
    style === "balanced" &&
    !((flagOk && chance >= 70) || (chance >= 72 && rating >= 65))
  )
    return null;
  if (style === "edge" && !(flagOk || (chance >= 65 && rating >= 60)))
    return null;

  const hGrp = String(m?.hGrp || "");
  const aGrp = String(m?.aGrp || "");
  const lowTier = isLowTierGroup(hGrp) || isLowTierGroup(aGrp);

  const vipScore = vipScoreFromMatch(m); // 0..100-ish

  const candidates = [];

  const allow = (cond) => !!cond;

  // Correct Score
  if (prefs?.autoMarkets?.correctScore) {
    if (lowTier) return null;
    if (isBottomTeam(m)) return null;

    // ✅ Use your helper (now prefers C. SCORE)
    const csOpt = pickCorrectScoreOption(m); // returns "1-0"
    if (!csOpt) return null;

    // ✅ chance from Model CS %
    const csProb = Number(m?.modelCSPercent) || 0;

    if (!(csProb >= t.cs)) return null;

    // ✅ csSupportScore expects "1-0" so this now works properly
    const support = csSupportScore(m, csOpt);
    const final = csProb + support + vipScore / 10;

    return {
      selectedMarket: "Correct Score",
      selectedOption: csOpt, // ✅ "1-0" not "1:0"
      score: final,
      prob: csProb,
    };
  }

  // 1X2
  if (prefs?.autoMarkets?.m1x2) {
    const homeOn = !!prefs?.auto1x2Options?.home;
    const drawOn = !!prefs?.auto1x2Options?.draw;
    const awayOn = !!prefs?.auto1x2Options?.away;

    if (homeOn) {
      const p = marketProb(m, "1X2", "Home");
      if (p >= t.oneX2) {
        const penalty = 0;
        candidates.push({
          selectedMarket: "1X2",
          selectedOption: "Home",
          prob: p,
          score: p + vipScore / 10 - penalty,
        });
      }
    }

    if (awayOn) {
      const p = marketProb(m, "1X2", "Away");
      if (p >= t.oneX2) {
        const penalty = 0;
        candidates.push({
          selectedMarket: "1X2",
          selectedOption: "Away",
          prob: p,
          score: p + vipScore / 10 - penalty,
        });
      }
    }

    if (drawOn) {
      const p = marketProb(m, "1X2", "Draw");
      // Draw gets extra penalty to prevent "Safe picks Draw instead of O/U"
      const drawPenalty = style === "safe" ? 15 : style === "balanced" ? 8 : 3;
      if (p >= t.draw) {
        candidates.push({
          selectedMarket: "1X2",
          selectedOption: "Draw",
          prob: p,
          score: p + vipScore / 10 - drawPenalty,
        });
      }
    }
  }
  /* ================================
     DOUBLE CHANCE (FIXED)
  ================================= */
  if (prefs?.autoMarkets?.doubleChance) {
    const home = Number(m?.homeWin) || 0;
    const draw = Number(m?.draw) || 0;
    const away = Number(m?.awayWin) || 0;

    if (prefs?.autoDoubleChanceOptions?.homeDraw) {
      const p = home + draw;
      if (p >= t.oneX2)
        candidates.push({
          selectedMarket: "Double Chance",
          selectedOption: "Home or Draw",
          prob: p,
          score: p + vipScore / 10,
        });
    }

    if (prefs?.autoDoubleChanceOptions?.homeAway) {
      const p = home + away;
      if (p >= t.oneX2)
        candidates.push({
          selectedMarket: "Double Chance",
          selectedOption: "Home or Away",
          prob: p,
          score: p + vipScore / 10,
        });
    }

    if (prefs?.autoDoubleChanceOptions?.drawAway) {
      const p = draw + away;
      if (p >= t.oneX2)
        candidates.push({
          selectedMarket: "Double Chance",
          selectedOption: "Draw or Away",
          prob: p,
          score: p + vipScore / 10,
        });
    }
  }
  /* ================================
   OVER / UNDER (MULTI)
================================ */

  if (
    prefs?.autoMarkets?.overUnder &&
    prefs?.autoOUOptions?.selections?.length
  ) {
    for (const sel of prefs.autoOUOptions.selections) {
      const market = `Over ${sel.line}`;
      const option = sel.type === "over" ? "Yes" : "No";
      const p = marketProb(m, market, option);

      if (p >= t.ou) {
        candidates.push({
          selectedMarket: market,
          selectedOption: option,
          prob: p,
          score: p + vipScore / 10,
        });
      }
    }
  }

  /* ================================
   HOME/AWAY OVER/UNDER 1.5 (NEW)
================================ */
  if (prefs?.autoMarkets?.haOverUnder15) {
    const homeOverOn = !!prefs?.autoHAOU15Options?.homeOver;
    const homeUnderOn = !!prefs?.autoHAOU15Options?.homeUnder;
    const awayOverOn = !!prefs?.autoHAOU15Options?.awayOver;
    const awayUnderOn = !!prefs?.autoHAOU15Options?.awayUnder;

    // Use intelligent calculation combining scoring and conceding stats
    const hgsOver15 = Number(m?.hgsOver15) || 0; // Home Goals Scored Over 1.5
    const hgcOver15 = Number(m?.hgcOver15) || 0; // Home Goals Conceded Over 1.5
    const agsOver15 = Number(m?.agsOver15) || 0; // Away Goals Scored Over 1.5
    const agcOver15 = Number(m?.agcOver15) || 0; // Away Goals Conceded Over 1.5

    // Home Over 1.5: Combine home attacking (hgsOver15) with away defensive weakness (agcOver15)
    if (homeOverOn) {
      const attackWeight = hgsOver15 * 0.65; // Home's ability to score 1.5+
      const defenseWeight = agcOver15 * 0.35; // Away's tendency to concede 1.5+
      const pHomeOver = clampN(attackWeight + defenseWeight, 0, 100);

      if (pHomeOver >= t.ou) {
        candidates.push({
          selectedMarket: "H/A O/U 1.5",
          selectedOption: "Home Over 1.5",
          prob: pHomeOver,
          score: pHomeOver + vipScore / 10,
        });
      }
    }

    // Home Under 1.5: Inverse of Home Over 1.5
    if (homeUnderOn) {
      const attackWeight = hgsOver15 * 0.65;
      const defenseWeight = agcOver15 * 0.35;
      const pHomeOver = clampN(attackWeight + defenseWeight, 0, 100);
      const pHomeUnder = 100 - pHomeOver;

      if (pHomeUnder >= t.ou) {
        candidates.push({
          selectedMarket: "H/A O/U 1.5",
          selectedOption: "Home Under 1.5",
          prob: pHomeUnder,
          score: pHomeUnder + vipScore / 10,
        });
      }
    }

    // Away Over 1.5: Combine away attacking (agsOver15) with home defensive weakness (hgcOver15)
    if (awayOverOn) {
      const attackWeight = agsOver15 * 0.65; // Away's ability to score 1.5+
      const defenseWeight = hgcOver15 * 0.35; // Home's tendency to concede 1.5+
      const pAwayOver = clampN(attackWeight + defenseWeight, 0, 100);

      if (pAwayOver >= t.ou) {
        candidates.push({
          selectedMarket: "H/A O/U 1.5",
          selectedOption: "Away Over 1.5",
          prob: pAwayOver,
          score: pAwayOver + vipScore / 10,
        });
      }
    }

    // Away Under 1.5: Inverse of Away Over 1.5
    if (awayUnderOn) {
      const attackWeight = agsOver15 * 0.65;
      const defenseWeight = hgcOver15 * 0.35;
      const pAwayOver = clampN(attackWeight + defenseWeight, 0, 100);
      const pAwayUnder = 100 - pAwayOver;

      if (pAwayUnder >= t.ou) {
        candidates.push({
          selectedMarket: "H/A O/U 1.5",
          selectedOption: "Away Under 1.5",
          prob: pAwayUnder,
          score: pAwayUnder + vipScore / 10,
        });
      }
    }
  }

  // BTTS
  if (prefs?.autoMarkets?.btts) {
    const yesOn = !!prefs?.autoBTTSOptions?.yes;
    const noOn = !!prefs?.autoBTTSOptions?.no;

    if (yesOn) {
      const p = marketProb(m, "BTTS", "Yes");
      if (p >= t.btts)
        candidates.push({
          selectedMarket: "BTTS",
          selectedOption: "Yes",
          prob: p,
          score: p + vipScore / 10,
        });
    }
    if (noOn) {
      const p = marketProb(m, "BTTS", "No");
      if (p >= t.btts)
        candidates.push({
          selectedMarket: "BTTS",
          selectedOption: "No",
          prob: p,
          score: p + vipScore / 10,
        });
    }
  }

  // Remove risky low-tier matches for safe completely
  if (style === "safe" && lowTier) return null;

  if (!candidates.length) return null;

  // If user selected specific markets,
  // prefer those instead of global highest score
  const selectedMarkets = Object.entries(prefs?.autoMarkets || {})
    .filter(([_, v]) => v === true)
    .map(([k]) => k);

  const filtered = candidates.filter((c) =>
    selectedMarkets.includes(c.selectedMarket.toLowerCase().replace(" ", "")),
  );

  const finalPool = filtered.length ? filtered : candidates;

  finalPool.sort((a, b) => b.score - a.score);

  return finalPool[0];
}

export function inferMarketOptionFromPick(m) {
  const pick = String(m?.pick || m?.tips || "").toLowerCase();

  if (pick.includes("home win"))
    return { selectedMarket: "1X2", selectedOption: "Home" };
  if (pick.includes("away win"))
    return { selectedMarket: "1X2", selectedOption: "Away" };
  if (pick.includes("draw"))
    return { selectedMarket: "1X2", selectedOption: "Draw" };

  if (pick.includes("un2.5") || pick.includes("under 2.5"))
    return { selectedMarket: "Over 2.5", selectedOption: "No" }; // No = Under

  if (pick.includes("ov2.5") || pick.includes("over 2.5"))
    return { selectedMarket: "Over 2.5", selectedOption: "Yes" };

  if (pick.includes("btts") && pick.includes("yes"))
    return { selectedMarket: "BTTS", selectedOption: "Yes" };
  if (pick.includes("btts") && pick.includes("no"))
    return { selectedMarket: "BTTS", selectedOption: "No" };

  // fallback: treat as 1X2 away/home/draw not known => no odds
  return { selectedMarket: "1X2", selectedOption: "Draw" };
}

export const cn = (...c) => c.filter(Boolean).join(" ");
export const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export const fairOddsFromProb = (probPercent) => {
  const n = Number(probPercent);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const p = Math.max(1, Math.min(99, n));
  return (100 / p).toFixed(2);
};

export const marketProbFromPick = (m) => {
  const raw = String(m?.pick || m?.tips || "")
    .trim()
    .toLowerCase();

  if (raw.includes("home win") || raw === "home") return m?.homeWin;
  if (raw.includes("away win") || raw === "away") return m?.awayWin;
  if (raw.includes("draw") || raw === "x") return m?.draw;

  if (raw.includes("un2.5") || raw.includes("under 2.5") || raw === "u2.5")
    return m?.un25;

  if (raw.includes("ov2.5") || raw.includes("over 2.5") || raw === "o2.5")
    return m?.ov25;

  if (
    raw.includes("gg") ||
    raw.includes("btts yes") ||
    raw.includes("btts: yes")
  )
    return m?.gg;

  if (raw.includes("ng") || raw.includes("btts no") || raw.includes("btts: no"))
    return m?.ng;

  return m?.chance; // fallback
};

export const fairOddsFromPickMarket = (m) =>
  fairOddsFromProb(marketProbFromPick(m));

export function getConfidenceLabel(match) {
  const chance = Number(match?.chance) || 0;
  const rating = Number(match?.rating) || 0;
  if (chance >= 80 && rating >= 70) return "High";
  if (chance >= 65 && rating >= 60) return "Medium";
  return "Experimental";
}

export function generatePickReasons(match) {
  const m = match || {};
  const reasons = [];
  const confidenceLabel = getConfidenceLabel(m);

  const hppg = Number(m.hppg);
  const appg = Number(m.appg);

  if (Number.isFinite(hppg) && Number.isFinite(appg)) {
    const diff = hppg - appg;
    if (diff >= 0.5)
      reasons.push(
        `Stronger home form (${hppg.toFixed(2)} vs ${appg.toFixed(2)} PPG)`,
      );
  }

  const hgs = Number(m.hgs);
  const agc = Number(m.agc);
  const ags = Number(m.ags);
  const hgc = Number(m.hgc);

  if (
    Number.isFinite(hgs) &&
    Number.isFinite(agc) &&
    hgs >= 1.6 &&
    agc >= 1.4
  ) {
    reasons.push("Home attack vs weak away defense");
  }

  if (
    Number.isFinite(ags) &&
    Number.isFinite(hgc) &&
    ags >= 1.4 &&
    hgc >= 1.4
  ) {
    reasons.push("Away team likely to score");
  }

  const hBtts = Number(m.hBtts);
  const aBtts = Number(m.aBtts);
  if (
    Number.isFinite(hBtts) &&
    Number.isFinite(aBtts) &&
    hBtts >= 65 &&
    aBtts >= 60
  ) {
    reasons.push(`BTTS trend strong (${Math.round((hBtts + aBtts) / 2)}%)`);
  }

  const hOv2 = Number(m.hOv2);
  const aOv2 = Number(m.aOv2);
  if (
    Number.isFinite(hOv2) &&
    Number.isFinite(aOv2) &&
    hOv2 >= 60 &&
    aOv2 >= 55
  ) {
    reasons.push("High probability of over 2.5 goals");
  }

  if (m.flag === "✅" && (Number(m.chance) || 0) >= 75) {
    reasons.push(`Model confidence ${Math.round(Number(m.chance) || 0)}%`);
  }

  return { confidenceLabel, reasons: reasons.slice(0, 4) };
}

export function whyTone(label) {
  if (label === "High") return "green";
  if (label === "Medium") return "yellow";
  return "gray";
}

export const valueTagFromVip = (vipScore = 0) => {
  const v = Number(vipScore) || 0;
  if (v >= 80) return "Value";
  if (v >= 70) return "Solid";
  return "Edge";
};

export const fairOddsFromChance = (chance) => {
  const n = Number(chance);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const c = Math.max(1, Math.min(99, n)); // avoid 0/100
  return (100 / c).toFixed(2);
};

export function getOddsForMatch(match) {
  if (!match) return null;

  // 1X2 odds
  if (match.homeOdds) return Number(match.homeOdds);
  if (match.drawOdds) return Number(match.drawOdds);
  if (match.awayOdds) return Number(match.awayOdds);

  // Over/Under
  if (match.o25Odds) return Number(match.o25Odds);
  if (match.u25Odds) return Number(match.u25Odds);

  // BTTS
  if (match.bttsYesOdds) return Number(match.bttsYesOdds);
  if (match.bttsNoOdds) return Number(match.bttsNoOdds);

  return null;
}
