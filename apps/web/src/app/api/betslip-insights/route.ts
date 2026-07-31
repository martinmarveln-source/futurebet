// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;
    const { matches, insightType } = await req.json();

    if (!matches || matches.length === 0) {
      return Response.json({ error: "No matches provided" }, { status: 400 });
    }

    if (!["positive", "reverse"].includes(insightType)) {
      return Response.json({ error: "Invalid insight type" }, { status: 400 });
    }

    // Limit to 10 matches for performance
    const limitedMatches = matches.slice(0, 10);

    // Check user permissions
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at 
      FROM auth_users 
      WHERE id = ${user.id}
    `;

    // 🔥 UPGRADE: Hierarchical & Subscription-Aware Role Checking
    const role = userRecord?.user_role || "free";
    const subStatus = userRecord?.subscription_status || "free";
    const subValid =
      !userRecord?.subscription_expires_at ||
      new Date(userRecord.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    // AI Insights are Premium+ only. Admin cascades down to Premium.
    const isPremium =
      isAdmin || role === "premium" || (subStatus === "premium" && subValid);

    if (!isPremium) {
      return Response.json(
        { error: "Premium subscription required" },
        { status: 403 }
      );
    }

    // Check usage limits for premium users (Admins bypass this)
    if (!isAdmin && isPremium) {
      const [todayUsage] = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE insight_type = 'positive') as positive_count,
          COUNT(*) FILTER (WHERE insight_type = 'reverse') as reverse_count
        FROM ai_insight_usage 
        WHERE user_id = ${user.id}
        AND DATE(created_at) = CURRENT_DATE
      `;

      const positiveUsed = parseInt(todayUsage.positive_count) || 0;
      const reverseUsed = parseInt(todayUsage.reverse_count) || 0;
      const totalUsed = positiveUsed + reverseUsed;

      if (totalUsed >= 20) {
        return Response.json(
          { error: "Daily insight limit reached" },
          { status: 429 }
        );
      }

      if (insightType === "reverse" && reverseUsed >= 3) {
        return Response.json(
          { error: "Daily reverse insight limit reached" },
          { status: 429 }
        );
      }
    }

    // Check cache for each match and collect results
    const insights = [];
    const uncachedMatches = [];

    for (const match of limitedMatches) {
      const prediction = match.pick || "N/A";
      const cacheKey = `${match.match}|${prediction}|${insightType}`;

      // Check cache first
      const [cachedInsight] = await sql`
        SELECT insight_data, created_at
        FROM ai_insights_cache
        WHERE cache_key = ${cacheKey}
        AND expires_at > NOW()
      `;

      if (cachedInsight) {
        // Use cached result
        insights.push({
          match: match.match,
          prediction: prediction,
          ...cachedInsight.insight_data,
        });
      } else {
        // Mark for AI generation
        uncachedMatches.push({ ...match, cacheKey, prediction });
      }
    }

    // Generate insights for uncached matches
    if (uncachedMatches.length > 0) {
      const aiInsights = await generateAIInsights(uncachedMatches, insightType);

      // Cache the new insights and add to results
      for (
        let i = 0;
        i < uncachedMatches.length && i < aiInsights.length;
        i++
      ) {
        const match = uncachedMatches[i];
        const aiInsight = aiInsights[i];

        // Cache the insight
        await sql`
          INSERT INTO ai_insights_cache (cache_key, match_name, prediction, insight_type, insight_data)
          VALUES (${match.cacheKey}, ${match.match}, ${
          match.prediction
        }, ${insightType}, ${JSON.stringify(aiInsight)})
          ON CONFLICT (cache_key) DO UPDATE SET 
            insight_data = EXCLUDED.insight_data,
            created_at = CURRENT_TIMESTAMP,
            expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
        `;

        insights.push({
          match: match.match,
          prediction: match.prediction,
          ...aiInsight,
        });
      }

      // Track usage for new insights generated
      for (const match of uncachedMatches) {
        await sql`
          INSERT INTO ai_insight_usage (user_id, match_data, insight_type, credits_used, cache_hit)
          VALUES (${user.id}, ${JSON.stringify(
          match
        )}, ${insightType}, 2, false)
        `;
      }
    }

    // Track cache hits
    const cacheHits = limitedMatches.length - uncachedMatches.length;
    if (cacheHits > 0) {
      for (let i = 0; i < cacheHits; i++) {
        await sql`
          INSERT INTO ai_insight_usage (user_id, match_data, insight_type, credits_used, cache_hit)
          VALUES (${user.id}, ${JSON.stringify({})}, ${insightType}, 0, true)
        `;
      }
    }

    return Response.json({
      insights: insights,
      insightType: insightType,
      cacheHits: cacheHits,
      newGenerated: uncachedMatches.length,
    });
  } catch (error) {
    console.error("Error generating betslip insights:", error);
    return Response.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

async function generateAIInsights(matches, insightType) {
  try {
    console.log("Starting generateAIInsights with:", {
      matchCount: matches.length,
      insightType,
    });

    const isPositive = insightType === "positive";

    const systemPrompt = isPositive
      ? `You are a football betting expert analyzing betslip selections. For each match and its prediction, analyze the specific statistical data provided and explain why the predicted outcome is likely to succeed. Focus on the actual stats that support the prediction.

Format your response as a JSON array with this exact structure:
[
  {
    "positiveInsight": [
      "Statistical reason based on provided data",
      "Form or performance factor from the data", 
      "Key metric that supports the prediction"
    ]
  }
]

Use the actual statistics provided (home/away form, PPG, goals scored/conceded, win rates, etc.) to justify each prediction. Keep explanations simple and focused on the most relevant stats.`
      : `You are a football betting expert analyzing potential risks in betslip selections. For each match and its prediction, examine the statistical data and identify specific factors that could cause the prediction to FAIL. Focus on concerning stats, poor form, or statistical weaknesses.

Format your response as a JSON array with this exact structure:
[
  {
    "reverseInsight": [
      "Statistical concern from the data",
      "Form or performance weakness", 
      "Risk factor that challenges the prediction"
    ]
  }
]

Use the actual statistics provided (poor form, low PPG, defensive weaknesses, away record, etc.) to identify risks. Keep explanations simple and focus on the most concerning stats.`;

    const userPrompt = matches
      .map(
        (match) =>
          `Match: ${match.match}
League: ${match.fullLeague || "Unknown League"}  
Date: ${match.date || "Unknown Date"}
Time: ${match.time || "Unknown Time"}
Prediction: ${match.prediction}

MATCH STATISTICS:
- Win Probabilities: Home ${match.homeWin || "N/A"}% | Draw ${
            match.draw || "N/A"
          }% | Away ${match.awayWin || "N/A"}%
- Model Rating: ${match.rating || "N/A"}% | Chance: ${match.chance || "N/A"}%
- BTTS: ${match.gg || "N/A"}% | Over 2.5: ${match.ov25 || "N/A"}%

HOME TEAM STATS:
- Form: ${match.hForm || "N/A"} | PPG: ${match.hppg || "N/A"}
- Record: ${match.hWin || 0}W-${match.hDraw || 0}D-${match.hLost || 0}L
- Goals: ${match.hgs || "N/A"} scored, ${match.hgc || "N/A"} conceded
- BTTS: ${match.hBtts || "N/A"}% | Clean Sheets: ${match.hcs || "N/A"}%
- Over 1.5 Scored: ${match.hgsOver15 || "N/A"}% | Over 1.5 Conceded: ${
            match.hgcOver15 || "N/A"
          }%

AWAY TEAM STATS:  
- Form: ${match.aForm || "N/A"} | PPG: ${match.appg || "N/A"}
- Record: ${match.aWin || 0}W-${match.aDraw || 0}D-${match.aLost || 0}L
- Goals: ${match.ags || "N/A"} scored, ${match.agc || "N/A"} conceded
- BTTS: ${match.aBtts || "N/A"}% | Clean Sheets: ${match.acs || "N/A"}%
- Over 1.5 Scored: ${match.agsOver15 || "N/A"}% | Over 1.5 Conceded: ${
            match.agcOver15 || "N/A"
          }%

ADDITIONAL DATA:
- Model Flag: ${match.flag || "N/A"}
- League Table: ${match.table || "N/A"}`
      )
      .join("\n\n");

    console.log("Making ChatGPT API request...");
    console.log(
      "Request payload:",
      JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      })
    );

    // Call ChatGPT API using the integration endpoint
    const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    console.log("ChatGPT API response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ChatGPT API error response:", errorData);
      throw new Error(
        `ChatGPT API Error: Failed to generate insights (${response.status}) - ${errorData}`
      );
    }

    const data = await response.json();
    console.log("ChatGPT API response received successfully");
    console.log("Full response data:", JSON.stringify(data, null, 2));

    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      console.error("Empty AI response from ChatGPT");
      console.error("Full response data:", JSON.stringify(data, null, 2));
      throw new Error("Empty AI response from ChatGPT");
    }

    console.log("Raw AI response:", aiResponse);

    // Parse JSON response
    let parsedInsights;
    try {
      parsedInsights = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", aiResponse);
      console.error("Parse error:", parseError);

      // Try to extract JSON from response if it has extra text
      const jsonMatch = aiResponse.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          parsedInsights = JSON.parse(jsonMatch[0]);
          console.log("Successfully extracted JSON from response");
        } catch (e) {
          throw new Error(
            "Invalid JSON response from AI - could not parse or extract JSON"
          );
        }
      } else {
        throw new Error("Invalid JSON response from AI - no JSON array found");
      }
    }

    if (!Array.isArray(parsedInsights)) {
      console.error("AI response is not an array:", parsedInsights);
      throw new Error("AI response format error - expected JSON array");
    }

    console.log(
      "Successfully parsed insights:",
      parsedInsights.length,
      "items"
    );
    return parsedInsights;
  } catch (error) {
    console.error("Error in generateAIInsights:", error.message);
    console.error("Full error stack:", error.stack);
    console.error("Full error:", error);

    // Return fallback insights with more specific error info
    const insightKey =
      insightType === "positive" ? "positiveInsight" : "reverseInsight";

    let fallbackMessages;
    if (error.message.includes("ChatGPT API Error")) {
      fallbackMessages = [
        "ChatGPT service temporarily unavailable",
        "Please try again in a moment",
        "AI analysis will return shortly",
      ];
    } else if (error.message.includes("Invalid JSON")) {
      fallbackMessages = [
        "AI response format error",
        "Retrying analysis may resolve this",
        "Technical issue with response parsing",
      ];
    } else if (error.message.includes("fetch")) {
      fallbackMessages = [
        "Network connection issue",
        "Please check your internet connection",
        "Retrying may resolve this issue",
      ];
    } else {
      fallbackMessages = [
        "Analysis temporarily unavailable",
        "Technical issue with AI service",
        "Please try again later",
      ];
    }

    return matches.map(() => ({
      [insightKey]: fallbackMessages,
    }));
  }
}