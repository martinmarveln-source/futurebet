// @ts-nocheck
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/utils/matchUtils";
import { Chip } from "./PremiumUI";

export default function SocialLinks({ darkMode }) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold">Join & Follow FutureBet</h3>
        <Chip tone="purple" darkMode={darkMode}>
          <Sparkles size={14} /> Community
        </Chip>
      </div>

      <div className="flex flex-wrap gap-3 mt-3">
        <a
          href="https://www.facebook.com/futurebetprediction"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ring-1",
            darkMode
              ? "bg-blue-500/15 text-blue-200 ring-blue-400/25 hover:bg-blue-500/25"
              : "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100",
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
          Facebook
        </a>

        <a
          href="https://www.youtube.com/@FUTUERBET"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ring-1",
            darkMode
              ? "bg-rose-500/15 text-rose-200 ring-rose-400/25 hover:bg-rose-500/25"
              : "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100",
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
          YouTube
        </a>

        <a
          href="https://t.me/futurebetprediction"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ring-1",
            darkMode
              ? "bg-cyan-500/15 text-cyan-200 ring-cyan-400/25 hover:bg-cyan-500/25"
              : "bg-cyan-50 text-cyan-700 ring-cyan-200 hover:bg-cyan-100",
          )}
        >
          <Send size={16} />
          Telegram
        </a>
      </div>
    </section>
  );
}
