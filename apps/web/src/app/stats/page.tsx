import type { Metadata } from "next";
import StatsHubClient from "./StatsHubClient";

export const metadata: Metadata = {
  title: "Football Stats Hub — Global Leagues & Teams | FutureBet",
  description:
    "Explore full-season football betting analytics across 86+ global leagues and 1,400+ clubs on FutureBet: BTTS rates, Over/Under 1.5/2.5/3.5 percentages, clean sheets, and home/away form.",
  alternates: {
    canonical: "https://futurebet.com.ng/stats",
  },
  openGraph: {
    title: "Football Stats Hub — 86+ Global Leagues & 1,400+ Teams | FutureBet",
    description:
      "Browse quantitative football league tables, BTTS rates, goal averages, and team trends across world football.",
    url: "https://futurebet.com.ng/stats",
    siteName: "FutureBet",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Football Stats Hub | FutureBet",
    description:
      "Full-season BTTS, Over/Under 2.5, clean sheet, and form analytics across 86+ football leagues.",
  },
};

export default function StatsHubPage() {
  return <StatsHubClient />;
}
