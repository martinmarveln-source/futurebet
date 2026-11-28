import type { Metadata } from "next";
import StatsInsightsClient from "./StatsInsightsClient";

export const metadata: Metadata = {
  title: "Global Stats Hub Market Insights — Top BTTS & Over 2.5 Teams | FutureBet",
  description:
    "Discover the top 1% statistical football teams and leagues worldwide for BTTS, Over 1.5/2.5/3.5 goals, Under lines, clean sheets, and home/away win rates.",
  alternates: {
    canonical: "https://futurebet.com.ng/stats/insights",
  },
  openGraph: {
    title: "Global Stats Hub Market Insights | FutureBet",
    description:
      "Rank the strongest BTTS, Over 2.5, clean sheet, and home/away teams across 86+ leagues with instant betslip integration.",
    url: "https://futurebet.com.ng/stats/insights",
    siteName: "FutureBet",
    type: "website",
  },
};

export default function StatsInsightsPage() {
  return <StatsInsightsClient />;
}
