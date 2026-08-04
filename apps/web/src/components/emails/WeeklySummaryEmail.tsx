import React from "react";

/**
 * A standard React component designed to be compiled to static HTML for emails.
 * Uses inline styles and basic table structures for maximum email client compatibility.
 */
export function WeeklySummaryEmail({
  userName = "FutureBet User",
  winRate = 78,
  totalProfit = "₦ 45,200",
  totalBets = 12,
  isPremium = false,
}) {
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
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 20px 0",
  };

  const statsGridStyle = {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
  };

  const statBoxStyle = {
    flex: 1,
    backgroundColor: "#1f2937", // gray-800
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center" as const,
    border: "1px solid #374151",
  };

  const statLabelStyle = {
    color: "#9ca3af",
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    margin: "0 0 8px 0",
  };

  const statValueStyle = {
    color: "#10b981", // emerald-500
    fontSize: "24px",
    fontWeight: "bold",
    margin: 0,
  };

  const ctaContainerStyle = {
    textAlign: "center" as const,
    marginTop: "30px",
  };

  const buttonStyle = {
    backgroundColor: "#2563eb", // blue-600
    color: "#ffffff",
    padding: "14px 28px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "bold",
    display: "inline-block",
    fontSize: "16px",
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
          <h1 style={{ ...h1Style, fontSize: "28px", color: "#60a5fa" }}>FutureBet</h1>
          <p style={{ color: "#bfdbfe", margin: 0 }}>Your Weekly Betting Review</p>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          <h2 style={h1Style}>Hi {userName},</h2>
          <p style={pStyle}>
            Here is a summary of your performance and the AI's top hits from the last 7 days.
            {isPremium ? " You're crushing it with Premium!" : " Imagine what these numbers could be with AI Insights unlocked."}
          </p>

          {/* Stats Row */}
          <table width="100%" border={0} cellPadding={0} cellSpacing={0} style={{ marginBottom: "30px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0 5px 0 0", width: "33%" }}>
                  <div style={statBoxStyle}>
                    <p style={statLabelStyle}>Win Rate</p>
                    <p style={statValueStyle}>{winRate}%</p>
                  </div>
                </td>
                <td style={{ padding: "0 5px", width: "33%" }}>
                  <div style={statBoxStyle}>
                    <p style={statLabelStyle}>Profit</p>
                    <p style={statValueStyle}>{totalProfit}</p>
                  </div>
                </td>
                <td style={{ padding: "0 0 0 5px", width: "33%" }}>
                  <div style={statBoxStyle}>
                    <p style={statLabelStyle}>Matches</p>
                    <p style={{ ...statValueStyle, color: "#60a5fa" }}>{totalBets}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={pStyle}>
            Our predictive models are already generating high-value picks for the upcoming weekend fixtures. Don't miss out on the early line value!
          </p>

          {/* CTA Button */}
          <div style={ctaContainerStyle}>
            <a href="https://futurebet.com.ng" style={buttonStyle}>
              {isPremium ? "View Weekend AI Picks" : "Unlock Premium AI Insights"}
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
