import { NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { getUserRoleAndSubscription } from "@/utils/supabaseServer";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { role } = await getUserRoleAndSubscription(session.user.id);
    if (role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    
    const { matches } = await req.json();
    if (!matches || !Array.isArray(matches) || matches.length === 0) return NextResponse.json({ error: "No matches provided" }, { status: 400 });
    
    const slipData = matches.map((m, i) => `Leg ${i + 1}: ${m.match}\n- Market: ${m.selectedMarket} -> ${m.selectedOption}\n- AI Chance: ${m.chance}%\n- Rating: ${m.rating}%\n- Odds: ${m.odds}\n- Home Pts: ${m.hPts || 0} / Away Pts: ${m.aPts || 0}`).join("\n\n");
    
    const systemPrompt = "You are an elite, brutally honest sports betting risk analyst. Your job is to analyze the user's betslip selections and flag the WEAKEST links. Be concise, analytical, and direct. Focus purely on the statistical numbers provided. Identify max 2 selections that are the riskiest and explain exactly why based on the stats. Format your response in simple, punchy paragraphs. Use emojis where appropriate.";
    const userPrompt = "Here is the current betslip:\n\n" + slipData + "\n\nPlease analyze this slip and highlight the biggest risks before I lock it in.";
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 400,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error:", errorText);
      return NextResponse.json({ error: "Failed to generate AI analysis." }, { status: 502 });
    }
    
    const data = await response.json();
    const analysis = data.content?.[0]?.text || "No analysis generated.";
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("AI Slip Analysis Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
