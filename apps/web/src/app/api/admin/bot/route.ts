import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  callGemini,
  GEMINI_CURRENT_BOT_MODELS,
  type GeminiContentMessage,
} from "@/lib/gemini";
import { buildAdminBotContext } from "@/lib/adminBotContext";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  const [userRecord] = await sql`
    SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1
  `;
  const role = String(userRecord?.user_role || "free").toLowerCase();
  if (role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access required" };
  }
  return { ok: true as const, adminUserId: String(session.user.id) };
}

async function ensureBotTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_bot_conversations (
      id BIGSERIAL PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Analysis Chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_bot_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES admin_bot_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model_used TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET(req: Request) {
  try {
    const authRes = await requireAdmin();
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    await ensureBotTables();
    const { searchParams } = new URL(req.url);
    const conversationIdParam = searchParams.get("conversationId");

    const conversations = await sql`
      SELECT id, title, created_at, updated_at
      FROM admin_bot_conversations
      WHERE admin_user_id = ${authRes.adminUserId}
      ORDER BY updated_at DESC
      LIMIT 20
    `;

    let messages: any[] = [];
    const targetConvId = conversationIdParam
      ? Number(conversationIdParam)
      : conversations?.[0]?.id
      ? Number(conversations[0].id)
      : null;

    if (targetConvId && Number.isFinite(targetConvId)) {
      const [owned] = await sql`
        SELECT id FROM admin_bot_conversations
        WHERE id = ${targetConvId} AND admin_user_id = ${authRes.adminUserId}
        LIMIT 1
      `;
      if (owned) {
        messages = await sql`
          SELECT id, role, content, model_used, metadata, created_at
          FROM admin_bot_messages
          WHERE conversation_id = ${targetConvId}
          ORDER BY created_at ASC, id ASC
          LIMIT 60
        `;
      }
    }

    return NextResponse.json({
      success: true,
      activeConversationId: targetConvId,
      conversations,
      messages,
      defaultModel: GEMINI_CURRENT_BOT_MODELS[0],
    });
  } catch (err: any) {
    console.error("GET /api/admin/bot error:", err);
    return NextResponse.json({ error: "Failed to load FutureBet Bot" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authRes = await requireAdmin();
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    await ensureBotTables();
    const body = await req.json();
    const userMessage = String(body?.message || "").trim();
    const currentBetslip: any[] = Array.isArray(body?.betslip) ? body.betslip : [];

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let conversationId = body?.conversationId ? Number(body.conversationId) : null;
    if (conversationId && Number.isFinite(conversationId)) {
      const [owned] = await sql`
        SELECT id FROM admin_bot_conversations
        WHERE id = ${conversationId} AND admin_user_id = ${authRes.adminUserId}
        LIMIT 1
      `;
      if (!owned) conversationId = null;
    }

    if (!conversationId) {
      const shortTitle = userMessage.slice(0, 60) + (userMessage.length > 60 ? "…" : "");
      const [created] = await sql`
        INSERT INTO admin_bot_conversations (admin_user_id, title)
        VALUES (${authRes.adminUserId}, ${shortTitle})
        RETURNING id
      `;
      conversationId = Number(created.id);
    }

    // Load recent conversation turns for continuity
    const priorRows = await sql`
      SELECT role, content
      FROM admin_bot_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY id DESC
      LIMIT 10
    `;
    const orderedPrior = [...(priorRows || [])].reverse();
    const recentUserTurns = orderedPrior
      .filter((m: any) => m.role === "user")
      .map((m: any) => String(m.content || ""));

    // Build real-time read-only match/league/VIP/multi-bet context (zero user PII)
    const { contextText, statsSnapshot, suggestedFixtures } = await buildAdminBotContext(
      userMessage,
      recentUserTurns
    );

    let betslipNote = "";
    if (currentBetslip.length > 0) {
      betslipNote =
        "\n\n## ADMIN'S CURRENT ACTIVE BETSLIP (" +
        currentBetslip.length +
        " legs)\n" +
        currentBetslip
          .slice(0, 20)
          .map(
            (m: any, i: number) =>
              `Leg ${i + 1}: ${m.match} — ${m.selectedMarket || "Pick"}: ${m.selectedOption || m.guide || "—"} @ ${Number(m.odds || 0).toFixed(2)}`
          )
          .join("\n");
    }

    const systemPrompt = `You are the **FutureBet Admin Intelligence Bot** — an internal quantitative football analyst and trading assistant built exclusively for FutureBet administrators.

## ACCESS & DATA BOUNDARIES
- You have FULL read access to live FutureBet football datasets provided below: matches_cache (probabilities, odds, goals/conceded, form, H2H, clean sheets, predicted scorelines, FT results), league_table_cache (standings, home/away splits, xG, leaderboards), today's VIP picks, curated Multi-Bet slip history, and Sandbox ML backtest accuracy.
- Strict Privacy Rule: You have ZERO access to personal user accounts, emails, passwords, payments, user bet histories, or tokens — and you must preserve user data privacy at all times. If asked for individual user PII, private user picks, or account data, explain that user PII is strictly isolated and unavailable to the bot.
- Strict Accuracy Rule: Cite ONLY real fixtures, team stats, odds, percentages, and FT scores explicitly present in the retrieved database context below. If a specific fixture or club isn't found in the context, state clearly that it wasn't found in the current database cache rather than guessing.
- Formatting: Use clean, scannable Markdown with bold club/league names, exact odds/probabilities, bullet points, or compact tables when comparing teams/slips.

${contextText}${betslipNote}`;

    const contents: GeminiContentMessage[] = [
      ...orderedPrior.map((m: any) => ({
        role: (m.role === "assistant" || m.role === "model" ? "model" : "user") as "user" | "model",
        parts: [{ text: String(m.content || "") }],
      })),
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const apiKey = process.env.GEMINI_API_KEY || "";
    const aiRes = await callGemini({
      apiKey,
      models: GEMINI_CURRENT_BOT_MODELS,
      systemPrompt,
      contents,
      temperature: 0.25,
      maxOutputTokens: 3000,
    });

    let replyText = "";
    let modelUsed = aiRes.modelUsed || GEMINI_CURRENT_BOT_MODELS[0];

    if (aiRes.ok && aiRes.text) {
      replyText = aiRes.text;
    } else {
      modelUsed = "db-snapshot-fallback";
      const topPreview = suggestedFixtures
        .slice(0, 5)
        .map(
          (f: any) =>
            `- **${f.match}** (${f.league}, ${f.date}): Pick **${f.guide || "—"}** | Chance ${Math.round(f.chance)}% | Rating ${Math.round(f.rating)}%`
        )
        .join("\n");
      replyText =
        `⚠️ Gemini model could not be reached right now (${aiRes.errors.map((e) => `${e.model}: ${e.status || e.message}`).join("; ")}).\n\n` +
        `**Live DB Snapshot (${statsSnapshot.todayISO}):** ${statsSnapshot.todayMatchesCount} matches today, ${statsSnapshot.leaguesTracked} leagues, ${statsSnapshot.teamsTracked} teams.\n\n` +
        (topPreview ? `**Top Matching Fixtures:**\n${topPreview}` : "No matching fixtures loaded.");
    }

    // Save turns into isolated admin_bot_messages table
    await sql`
      INSERT INTO admin_bot_messages (conversation_id, role, content)
      VALUES (${conversationId}, 'user', ${userMessage})
    `;
    await sql`
      INSERT INTO admin_bot_messages (conversation_id, role, content, model_used, metadata)
      VALUES (
        ${conversationId},
        'assistant',
        ${replyText},
        ${modelUsed},
        ${JSON.stringify({ statsSnapshot, suggestedFixturesCount: suggestedFixtures.length })}
      )
    `;
    await sql`
      UPDATE admin_bot_conversations
      SET updated_at = NOW()
      WHERE id = ${conversationId}
    `;

    return NextResponse.json({
      success: true,
      conversationId,
      reply: replyText,
      modelUsed,
      statsSnapshot,
      suggestedFixtures,
    });
  } catch (err: any) {
    console.error("POST /api/admin/bot error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authRes = await requireAdmin();
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    await ensureBotTables();
    const { searchParams } = new URL(req.url);
    const conversationId = Number(searchParams.get("conversationId") || 0);
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    await sql`
      DELETE FROM admin_bot_conversations
      WHERE id = ${conversationId} AND admin_user_id = ${authRes.adminUserId}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/bot error:", err);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
