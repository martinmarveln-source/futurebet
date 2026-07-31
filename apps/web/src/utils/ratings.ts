// @ts-nocheck
export const getRatingColor = (rating, darkMode) => {
  if (rating >= 80) return darkMode ? "#10B981" : "#059669";
  if (rating >= 60) return darkMode ? "#F59E0B" : "#D97706";
  return darkMode ? "#EF4444" : "#DC2626";
};

export const getRatingBand = (rating) => {
  if (rating >= 80) return "High";
  if (rating >= 60) return "Medium";
  return "Low";
};
