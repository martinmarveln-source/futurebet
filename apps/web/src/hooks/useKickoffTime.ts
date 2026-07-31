// @ts-nocheck
import { useCallback } from "react";

export function useKickoffTime() {
  const parseKickoffDateTime = useCallback((m) => {
    const iso = String(m?.date || m?.isoDate || "").trim();
    const t = String(m?.time || "").trim();
    if (!iso) return null;
    const time = t ? (t.length === 5 ? `${t}:00` : t) : "00:00:00";
    const d = new Date(`${iso}T${time}`);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }, []);

  const hasKickoffPassed = useCallback(
    (m) => {
      const kickoff = parseKickoffDateTime(m);
      if (!kickoff) return false;
      const bufferMs = 60 * 1000;
      return Date.now() >= kickoff.getTime() + bufferMs;
    },
    [parseKickoffDateTime],
  );

  return {
    parseKickoffDateTime,
    hasKickoffPassed,
  };
}
