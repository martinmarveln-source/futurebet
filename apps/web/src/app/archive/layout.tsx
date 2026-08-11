import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Historical Results Archive | Futurebet",
  description: "Browse historical AI football predictions and VIP betting tips from previous days to backtest and verify Futurebet's algorithmic accuracy.",
  openGraph: {
    title: "Historical Results Archive | Futurebet",
    description: "Browse historical AI football predictions and verify our model's accuracy.",
  },
};

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
