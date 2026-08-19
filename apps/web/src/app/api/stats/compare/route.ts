import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams, protocol, host } = new URL(request.url);
    const team1 = searchParams.get('team1');
    const team2 = searchParams.get('team2');
    const season = searchParams.get('season') || '2026/27';
    const league = searchParams.get('league') || '';

    if (!team1 || !team2) {
      return NextResponse.json({ error: "Missing team1 or team2" }, { status: 400 });
    }

    const baseUrl = `${protocol}//${host}`;
    
    // Fetch stats for both teams using the team endpoint
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/stats/team/${encodeURIComponent(team1)}?season=${season}&league=${encodeURIComponent(league)}`),
      fetch(`${baseUrl}/api/stats/team/${encodeURIComponent(team2)}?season=${season}&league=${encodeURIComponent(league)}`)
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();

    if (!data1.success || !data2.success) {
      return NextResponse.json({ error: "Failed to fetch team data" }, { status: 500 });
    }

    const t1 = data1;
    const t2 = data2;

    const comparison = {
      ppg: { team1: t1.general.ppg, team2: t2.general.ppg },
      gf_per_game: { team1: t1.goals.gf_per_game, team2: t2.goals.gf_per_game },
      ga_per_game: { team1: t1.goals.ga_per_game, team2: t2.goals.ga_per_game },
      over_25: { team1: t1.betting.over_25, team2: t2.betting.over_25 },
      btts: { team1: t1.betting.btts_yes, team2: t2.betting.btts_yes },
      clean_sheet: { team1: t1.betting.clean_sheet, team2: t2.betting.clean_sheet },
      form: { team1: t1.form.overall, team2: t2.form.overall }
    };

    return NextResponse.json({
      success: true,
      comparison
    });

  } catch (error: any) {
    console.error("Team comparison error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch comparison stats." },
      { status: 500 }
    );
  }
}
