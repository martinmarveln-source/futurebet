import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account | Futurebet",
  description: "Join Futurebet today. Sign up to unlock highly accurate AI football predictions, data-driven betting strategies, and VIP market odds.",
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
