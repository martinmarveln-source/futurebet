import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const [userRecord] = await sql`SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
    const role = userRecord?.user_role || "free";
    if (role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    
    const { matches } = await req.json();
    if (!matches || !Array.isArray(matches) || matches.length === 0) return NextResponse.json({ error: "No matches provided" }, { status: 400 });
    
    const slipData = matches.map((m, i) => `Leg ${i + 1}: ${m.match}\n- Market: ${m.selectedMarket} -> ${m.selectedOption}\n- AI Chance: ${m.chance}%\n- Rating: ${m.rating}%\n- Odds: ${m.odds}\n- Home Pts: ${m.hPts || 0} / Away Pts: ${m.aPts || 0}`).join("\n\n");
    
    const systemPrompt = "You are an elite sports betting risk analyst. Analyze the betslip and flag the WEAKEST picks.\n\nFormat your response EXACTLY like this:\n\n⚠️ **[Match Name] — [Market/Pick]**\n[2-3 sentences max about the risk. Be direct and specific about the stats.]\n\n⚠️ **[Match Name 2 — if there is a 2nd weak pick]**\n[2-3 sentences max.]\n\n✅ **Overall Verdict:**\n[One sentence summary — safe to lock or risky?]\n\nRules: Flag max 2 picks. Use exact numbers from the data. No intro text. Start directly with the first flag.";
    const userPrompt = "Here is the current betslip:\n\n" + slipData + "\n\nPlease analyze this slip and highlight the biggest risks before I lock it in.";
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: "Failed to generate AI analysis." }, { status: 502 });
    }
    
    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("AI Slip Analysis Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
