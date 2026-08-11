import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Futurebet AI Predictions",
  description: "Sign in to your Futurebet account to access premium AI football predictions, betting analytics, and VIP market insights.",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
