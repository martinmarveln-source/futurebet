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

  // Over/Under 1.5, 3.5, 4.5 — use direct values or Poisson approximation
  const avgGoals = n(m?.avg) || ((n(m?.hgs) + n(m?.hgc) + n(m?.ags) + n(m?.agc)) / 2) || 0;
  const pOv15 = n(m?.ov15) || (avgGoals > 0 ? approxOverProbFromAvg(avgGoals, 1.5) : 0);
  const pUn15 = pOv15 > 0 ? 100 - pOv15 : 0;
  const pOv35 = n(m?.ov35) || (avgGoals > 0 ? approxOverProbFromAvg(avgGoals, 3.5) : 0);
  const pUn35 = pOv35 > 0 ? 100 - pOv35 : 0;
  const pOv45 = n(m?.ov45) || (avgGoals > 0 ? approxOverProbFromAvg(avgGoals, 4.5) : 0);
  const pUn45 = pOv45 > 0 ? 100 - pOv45 : 0;

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

    { market: "Over 1.5", option: "Yes", prob: pOv15 },
    { market: "Over 1.5", option: "No", prob: pUn15 },

    { market: "Over 3.5", option: "Yes", prob: pOv35 },
    { market: "Over 3.5", option: "No", prob: pUn35 },

    { market: "Over 4.5", option: "Yes", prob: pOv45 },
    { market: "Over 4.5", option: "No", prob: pUn45 },

    { market: "BTTS", option: "Yes", prob: pGG },
    { market: "BTTS", option: "No", prob: pNG },

    // Double Chance — great for SAFE:
    { market: "Double Chance", option: "Home or Draw", prob: pHD },
    { market: "Double Chance", option: "Home or Away", prob: pHA },
    { market: "Double Chance", option: "Draw or Away", prob: pDA },
  ]
    .filter((x) => x.prob > 0 && x.prob <= 100)
    .map((x) => ({ ...x, score: x.prob })); // base scoring

  // Style tuning & draw protection
  const isHighDraw = pDraw >= 27;
  for (const c of candidates) {
    if (isHighDraw) {
      if (c.market === "1X2" && c.option !== "Draw") c.score *= 0.88;
      if (c.market === "Double Chance") c.score *= 1.12;
    }

    if (style === "safe") {
      // Avoid volatile markets a bit
      if (c.market === "1X2" && c.option === "Draw") c.score *= 0.85;
      if (c.market === "BTTS") c.score *= 0.92;
      if (c.market === "Over 2.5") c.score *= 0.95;
      if (c.market === "Over 1.5") c.score *= 1.02; // Over 1.5 is safer — boost slightly
      if (c.market === "Over 3.5") c.score *= 0.88; // 3.5+ is risky for safe
      if (c.market === "Over 4.5") c.score *= 0.80; // 4.5+ very volatile for safe

      // Prefer Double Chance for safety
      if (c.market === "Double Chance") c.score *= 1.05;
    }

    if (style === "edge") {
      // Slightly prefer markets that usually pay better
      if (c.market === "1X2" && c.option !== "Draw") c.score *= 1.02;
      if (c.market === "Over 2.5") c.score *= 1.01;
      if (c.market === "BTTS") c.score *= 1.01;
      if (c.market === "Over 1.5") c.score *= 0.96; // Low odds, less edge value
      if (c.market === "Over 3.5") c.score *= 1.04; // Higher odds = more edge
      if (c.market === "Over 4.5") c.score *= 1.06; // High odds = good edge play

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
      dc: 80,
      draw: 40,
      cs: 10,
    };
  }
  if (style === "balanced") {
    return {
      ou: 60,
      btts: 60,
      oneX2: 55,
      dc: 74,
      draw: 33,
      cs: 8,
    };
  }
  // edge
  return {
    ou: 55,
    btts: 55,
    oneX2: 50,
    dc: 68,
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

    // A utility to penalize score if odds are too low
    const dcScore = (p, opt) => {
      let score = p + vipScore / 10;
      // if odds are provided and they are too low (e.g. < 1.15), penalize to avoid worthless picks
      const odds = resolveOddsForSelection(m, "Double Chance", opt);
      if (odds && Number(odds) > 1 && Number(odds) < 1.18) {
        score -= 10;
      }
      return score;
    };

    if (prefs?.autoDoubleChanceOptions?.homeDraw) {
      const p = home + draw;
      if (p >= t.dc)
        candidates.push({
          selectedMarket: "Double Chance",
          selectedOption: "Home or Draw",
          prob: p,
          score: dcScore(p, "Home or Draw"),
        });
    }

    if (prefs?.autoDoubleChanceOptions?.homeAway) {
      const p = home + away;
      if (p >= t.dc)
        candidates.push({
          selectedMarket: "Double Chance",
          selectedOption: "Home or Away",
          prob: p,
          score: dcScore(p, "Home or Away"),
        });
    }

    if (prefs?.autoDoubleChanceOptions?.drawAway) {
      const p = draw + away;
      if (p >= t.dc)
        candidates.push({
          selectedMarket: "Double Chance",
          selectedOption: "Draw or Away",
          prob: p,
          score: dcScore(p, "Draw or Away"),
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

  
  // ================================
  // PHASE 1: COMBO (SAME-GAME PARLAY) AUTOPICK
  // ================================
  if (prefs?.autoMarkets?.comboPicks) {
    const oneX2Cands = candidates.filter(c => c.selectedMarket === "1X2");
    const ouCands = candidates.filter(c => c.selectedMarket.startsWith("Over "));
    const bttsCands = candidates.filter(c => c.selectedMarket === "BTTS");

    // Helper to generate combo
    const addCombo = (c1, c2) => {
      // If we are dealing with high probability singles, their joint probability is P(A)*P(B).
      // Because they are correlated, we add a slight correlation boost.
      let syntheticProb = (c1.prob / 100) * (c2.prob / 100) * 100;
      
      // Correlation boost: Home Win + Over 1.5 are positively correlated.
      if (c1.selectedOption === "Home" || c1.selectedOption === "Away") {
        if (c2.selectedOption === "Yes") syntheticProb *= 1.15; // Positive correlation for Over/BTTS Yes with Win
        if (c2.selectedOption === "No") syntheticProb *= 0.90;  // Negative correlation with Under/BTTS No
      }
      
      const prob = Math.min(99, syntheticProb);
      
      // Only push if it passes a baseline threshold
      if (prob >= (t.oneX2 - 10)) { // Lowered threshold because combos naturally drop in prob
        candidates.push({
          selectedMarket: "Combo",
          selectedOption: `${c1.selectedOption} & ${c2.selectedOption} (${c2.selectedMarket})`,
          prob: prob,
          score: prob + vipScore / 10 + 10, // +10 to strongly prefer Combos over Singles if combo is enabled
          comboA: c1,
          comboB: c2,
        });
      }
    };

    // Combine 1X2 with Over/Under
    for (const c1 of oneX2Cands) {
      for (const c2 of ouCands) {
        addCombo(c1, c2);
      }
    }
    
    // Combine 1X2 with BTTS
    for (const c1 of oneX2Cands) {
      for (const c2 of bttsCands) {
        addCombo(c1, c2);
      }
    }
  }


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

  if (raw.includes("1x") || raw.includes("home or draw"))
    return (Number(m?.homeWin) || 0) + (Number(m?.draw) || 0);
  if (raw.includes("x2") || raw.includes("draw or away"))
    return (Number(m?.draw) || 0) + (Number(m?.awayWin) || 0);
  if (raw.includes("12") || raw.includes("home or away"))
    return (Number(m?.homeWin) || 0) + (Number(m?.awayWin) || 0);

  if (raw.includes("un2.5") || raw.includes("under 2.5") || raw === "u2.5")
    return m?.un25;

  if (raw.includes("ov2.5") || raw.includes("over 2.5") || raw === "o2.5")
    return m?.ov25;

  if (raw.includes("un1.5") || raw.includes("under 1.5") || raw === "u1.5")
    return m?.un15 || (m?.ov15 ? 100 - Number(m.ov15) : undefined);

  if (raw.includes("ov1.5") || raw.includes("over 1.5") || raw === "o1.5")
    return m?.ov15;

  if (raw.includes("un3.5") || raw.includes("under 3.5") || raw === "u3.5")
    return m?.un35 || (m?.ov35 ? 100 - Number(m.ov35) : undefined);

  if (raw.includes("ov3.5") || raw.includes("over 3.5") || raw === "o3.5")
    return m?.ov35;

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

/**
 * Formats a number as Nigerian Naira (₦)
 * e.g. 15000 -> "₦ 15,000"
 */
export function formatNaira(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "₦ 0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace("NGN", "₦").trim();
}

/**
 * Formats market & option to standardized concise betting notation:
 * 1. Home Win -> Home
 * 2. Draw -> Draw
 * 3. Away Win -> Away
 * 4. Over 2.5 Yes -> Over 2.5
 * 5. Over 2.5 No -> Under 2.5
 * 6. BTTS Yes -> GG
 * 7. BTTS No -> NG
 * 8. Home or Draw -> 1X
 * 9. Home or Away -> 12
 * 10. Draw or Away -> X2
 * etc.
 */
export function formatSlipMarketLabel(selectedMarket = "", selectedOption = "") {
  const m = String(selectedMarket || "").trim();
  const o = String(selectedOption || "").trim();
  const combined = `${m} ${o}`.toLowerCase().replace(/[:\-_]/g, " ");

  // 0. Combo Bet Markets (check BEFORE single markets so "Home and Over 1.5" isn't truncated to "Home" or "Over 1.5")
  const hasAndOrAmp = /\band\b|&|\+/.test(combined) || m.toLowerCase().includes("combo");
  if (hasAndOrAmp) {
    const isOver15 = combined.includes("1.5") || combined.includes("15");
    const isOver25 = combined.includes("2.5") || combined.includes("25");
    const isOver35 = combined.includes("3.5") || combined.includes("35");
    const isUnder = combined.includes("under");
    const goalPart = isOver35 ? (isUnder ? "Under 3.5" : "Over 3.5") : isOver25 ? (isUnder ? "Under 2.5" : "Over 2.5") : isOver15 ? (isUnder ? "Under 1.5" : "Over 1.5") : "";

    if ((combined.includes("gg") || combined.includes("gh") || combined.includes("btts") || combined.includes("both")) && goalPart) {
      return `GG & ${goalPart}`;
    }
    if ((combined.includes("1x") || combined.includes("home or draw") || combined.includes("home win or draw")) && goalPart) {
      return `1X & ${goalPart}`;
    }
    if ((combined.includes("x2") || combined.includes("away or draw") || combined.includes("draw or away") || combined.includes("away win or draw")) && goalPart) {
      return `X2 & ${goalPart}`;
    }
    if ((combined.includes("home") || /\b1\b/.test(combined)) && goalPart) {
      return `Home & ${goalPart}`;
    }
    if ((combined.includes("away") || /\b2\b/.test(combined)) && goalPart) {
      return `Away & ${goalPart}`;
    }
  }

  // 1X2 / Match Winner
  if (combined.includes("home win") || (m === "1X2" && o.toLowerCase() === "home")) return "Home";
  if (combined.includes("away win") || (m === "1X2" && o.toLowerCase() === "away")) return "Away";
  if (combined.includes("draw") && !combined.includes("double chance") && !combined.includes("or draw")) return "Draw";

  // Double Chance
  if (combined.includes("home or draw") || combined.includes("1x")) return "1X";
  if (combined.includes("home or away") || combined.includes("12") || combined.includes("1 2")) return "12";
  if (combined.includes("draw or away") || combined.includes("x2") || combined.includes("x 2")) return "X2";

  // Both Teams To Score (BTTS)
  if (combined.includes("btts") || combined.includes("both teams to score") || combined.includes("gg") || combined.includes("ng")) {
    if (combined.includes("no") || combined.includes("ng")) return "NG";
    if (combined.includes("yes") || combined.includes("gg")) return "GG";
  }

  // Over / Under 2.5
  if (combined.includes("2.5") || combined.includes("25")) {
    if (combined.includes("under") || combined.includes("no") || combined.includes("un25")) return "Under 2.5";
    if (combined.includes("over") || combined.includes("yes") || combined.includes("ov25")) return "Over 2.5";
  }

  // Over / Under 1.5
  if (combined.includes("1.5") || combined.includes("15")) {
    if (combined.includes("under") || combined.includes("no") || combined.includes("un15")) return "Under 1.5";
    if (combined.includes("over") || combined.includes("yes") || combined.includes("ov15")) return "Over 1.5";
  }

  // Over / Under 3.5
  if (combined.includes("3.5") || combined.includes("35")) {
    if (combined.includes("under") || combined.includes("no") || combined.includes("un35")) return "Under 3.5";
    if (combined.includes("over") || combined.includes("yes") || combined.includes("ov35")) return "Over 3.5";
  }

  // Over / Under 4.5
  if (combined.includes("4.5") || combined.includes("45")) {
    if (combined.includes("under") || combined.includes("no") || combined.includes("un45")) return "Under 4.5";
    if (combined.includes("over") || combined.includes("yes") || combined.includes("ov45")) return "Over 4.5";
  }

  // Correct Score
  if (m.toLowerCase().includes("correct score") || m.toLowerCase() === "cs") {
    return `CS ${o}`;
  }

  // Fallback: If option is already clean (e.g. "Home", "Away", "Draw", "Over 2.5"), return option
  if (o) {
    if (o.toLowerCase() === "home" || o.toLowerCase() === "away" || o.toLowerCase() === "draw") return o;
    if (m && o !== "Yes" && o !== "No") return `${m}: ${o}`;
    return o;
  }

  return m || "Pick";
}

/**
 * Formats country and league cleanly without duplicating the country name.
 * e.g.
 * country: "England", league: "England - Championship" -> "England • Championship"
 * country: "Italy", league: "Italy - Serie B" -> "Italy • Serie B"
 * country: "Montenegro", league: "Montenegro - Prva Crnogorska Liga" -> "Montenegro • Prva Crnogorska Liga"
 * country: "England", league: "Premier League" -> "England • Premier League"
 * country: "England", league: "England" -> "England"
 */
export function formatSlipLeague(country = "", league = "") {
  const c = String(country || "").trim();
  let l = String(league || "").trim();

  // Strip international / world prefixes from league
  l = l.replace(/^(?:Intl|World)\s*[-:•/–—]\s*/i, "").replace(/^(?:Intl|World)\s+/i, "").trim();

  if (!c && !l) return "Football";
  if (!c) return l;
  if (!l) return c;

  // Clean redundant leading country name(s) and separators from the league string
  let cleanLeague = l;
  let changed = true;
  while (changed) {
    changed = false;
    if (cleanLeague.toLowerCase() === c.toLowerCase()) {
      cleanLeague = "";
      break;
    }
    if (cleanLeague.toLowerCase().startsWith(c.toLowerCase())) {
      const remainder = cleanLeague.slice(c.length).trim();
      const strippedRemainder = remainder.replace(/^[-:•/–—|\s]+/, "").trim();
      if (strippedRemainder !== cleanLeague) {
        cleanLeague = strippedRemainder;
        changed = true;
      }
    }
  }

  cleanLeague = cleanLeague.replace(/^[-:•/–—|\s]+/, "").trim();

  if (!cleanLeague || cleanLeague.toLowerCase() === c.toLowerCase()) {
    return c;
  }

  return `${c} • ${cleanLeague}`;
}
