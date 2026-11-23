import React from "react";

interface WeeklySummaryEmailProps {
  userName?: string;
  winRate?: number;
  totalProfit?: string;
  totalBets?: number;
  vipWinRate?: number;
  isPremium?: boolean;
  isSilver?: boolean;
  tier?: "free" | "silver" | "premium" | "admin";
  isZeroBets?: boolean;
}

/**
 * A standard React component designed to be compiled to static HTML for emails.
 * Uses inline styles and basic table structures for maximum email client compatibility.
 */
export function WeeklySummaryEmail({
  userName = "FutureBet User",
  winRate = 78,
  totalProfit = "+₦0",
  totalBets = 0,
  vipWinRate = 82,
  isPremium = false,
  isSilver = false,
  tier = "free",
  isZeroBets,
}: WeeklySummaryEmailProps) {
  const effectiveIsZero = isZeroBets !== undefined ? isZeroBets : totalBets === 0;
  const effectiveVipRate = vipWinRate && vipWinRate > 0 ? vipWinRate : 82;

  // Determine user level
  const isVipTier = isPremium || tier === "premium" || tier === "admin";
  const isSilverTier = !isVipTier && (isSilver || tier === "silver");

  // Tier copy and badges
  const tierBadgeText = isVipTier
    ? "VIP GOLD MEMBER"
    : isSilverTier
    ? "SILVER ANALYST"
    : "FREE TIER";

  const tierBadgeBg = isVipTier
    ? "#f59e0b"
    : isSilverTier
    ? "#3b82f6"
    : "#6b7280";

  let greetingMessage = "";
  if (effectiveIsZero) {
    if (isVipTier) {
      greetingMessage = `You haven't logged any tickets this week. While you took a breather, our VIP models maintained a stellar ${effectiveVipRate}% benchmark accuracy across weekend fixtures.`;
    } else if (isSilverTier) {
      greetingMessage = `You haven't logged any tickets this week. Your Silver limits are ready for the weekend. Track your tickets to monitor your personal strike rate!`;
    } else {
      greetingMessage = `FutureBet AI algorithms hit ${effectiveVipRate}% accuracy across European matches this week. Here is what you missed with Free tier.`;
    }
  } else {
    const isProfitable = !totalProfit.includes("-") && totalProfit !== "+₦0" && totalProfit !== "₦0";
    if (isProfitable) {
      greetingMessage = `Outstanding week! You locked in a ${totalProfit} net return across ${totalBets} tracked bets with a ${winRate}% strike rate. You're making the model work for you!`;
    } else {
      greetingMessage = `Here is your 7-day betting recap. Despite variance this week across ${totalBets} tickets, our weekend high-conviction models have recalibrated for positive expected value (+EV).`;
    }
  }

  const mainStyle = {
    backgroundColor: "#030712", // gray-950
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif",
    padding: "40px 20px",
    color: "#ffffff",
  };

  const containerStyle = {
    backgroundColor: "#111827", // gray-900
    borderRadius: "16px",
    maxWidth: "600px",
    margin: "0 auto",
    border: "1px solid #1f2937", // gray-800
    overflow: "hidden",
  };

  const headerStyle = {
    backgroundColor: "#1e3a8a", // blue-900
    padding: "30px 20px",
    textAlign: "center" as const,
    borderBottom: "1px solid #1e40af",
  };

  const contentStyle = {
    padding: "30px",
  };

  const h1Style = {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    letterSpacing: "-0.5px",
  };

  const pStyle = {
    color: "#9ca3af", // gray-400
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 20px 0",
  };

  const statBoxStyle = {
    backgroundColor: "#1f2937", // gray-800
    padding: "16px 12px",
    borderRadius: "12px",
    textAlign: "center" as const,
    border: "1px solid #374151",
  };

  const statLabelStyle = {
    color: "#9ca3af",
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: "0 0 6px 0",
    fontWeight: "bold" as const,
  };

  const statValueStyle = {
    color: "#10b981", // emerald-500
    fontSize: "22px",
    fontWeight: "bold",
    margin: 0,
  };

  const ctaContainerStyle = {
    textAlign: "center" as const,
    marginTop: "25px",
  };

  const buttonStyle = {
    backgroundColor: isVipTier ? "#f59e0b" : "#2563eb",
    color: isVipTier ? "#000000" : "#ffffff",
    padding: "14px 28px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "bold",
    display: "inline-block",
    fontSize: "15px",
  };

  const footerStyle = {
    padding: "20px",
    textAlign: "center" as const,
    color: "#6b7280",
    fontSize: "12px",
    borderTop: "1px solid #1f2937",
  };

  return (
    <div style={mainStyle}>
      <div style={containerStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "inline-block", backgroundColor: tierBadgeBg, color: "#ffffff", padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px", marginBottom: "8px" }}>
            {tierBadgeText}
          </div>
          <h1 style={{ ...h1Style, fontSize: "28px", color: "#60a5fa", margin: "4px 0" }}>FutureBet</h1>
          <p style={{ color: "#bfdbfe", margin: 0, fontSize: "14px" }}>Weekly Performance Review</p>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          <h2 style={h1Style}>Hi {userName},</h2>
          <p style={pStyle}>
            {greetingMessage}
          </p>

          {/* Stats Row */}
          <table width="100%" border={0} cellPadding={0} cellSpacing={0} style={{ marginBottom: "24px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0 5px 0 0", width: "33%" }}>
                  <div style={statBoxStyle}>
                    <p style={statLabelStyle}>{effectiveIsZero ? "AI Strike Rate" : "Win Rate"}</p>
                    <p style={statValueStyle}>{effectiveIsZero ? `${effectiveVipRate}%` : `${winRate}%`}</p>
                  </div>
                </td>
                <td style={{ padding: "0 5px", width: "33%" }}>
                  <div style={statBoxStyle}>
                    <p style={statLabelStyle}>{effectiveIsZero ? "Top +EV Hit" : "Net Profit"}</p>
                    <p style={{ ...statValueStyle, color: effectiveIsZero ? "#f59e0b" : totalProfit.includes('-') ? "#ef4444" : "#10b981" }}>
                      {effectiveIsZero ? "+21.4% ROI" : totalProfit}
                    </p>
                  </div>
                </td>
                <td style={{ padding: "0 0 0 5px", width: "33%" }}>
                  <div style={statBoxStyle}>
                    <p style={statLabelStyle}>{effectiveIsZero ? "Weekend Slate" : "VIP Accuracy"}</p>
                    <p style={{ ...statValueStyle, color: "#38bdf8" }}>
                      {effectiveIsZero ? "16 Picks" : `${effectiveVipRate}%`}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {effectiveIsZero && (
            <div style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "12px", color: "#93c5fd" }}>
              💡 <strong>Note:</strong> Showing AI Platform Benchmarks because no personal betslips were recorded this week.
            </div>
          )}

          <p style={pStyle}>
            Our predictive models are running 24/7 scanning line movements and team form for this weekend's fixtures.
          </p>

          {/* CTA Button */}
          <div style={ctaContainerStyle}>
            <a href="https://futurebet.com.ng" style={buttonStyle}>
              {isVipTier ? "View Weekend VIP Picks" : isSilverTier ? "Explore Silver Picks & Upgrade" : "Unlock Full AI Insights"}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <p style={{ margin: "0 0 10px 0" }}>© 2026 FutureBet Analytics. All rights reserved.</p>
          <p style={{ margin: 0 }}>
            <a href="https://futurebet.com.ng" style={{ color: "#6b7280", textDecoration: "underline" }}>Manage Preferences</a> | 
            <a href="https://futurebet.com.ng" style={{ color: "#6b7280", textDecoration: "underline", marginLeft: "10px" }}>Unsubscribe</a>
          </p>
        </div>

      </div>
    </div>
  );
}
