"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { PaystackButton } from "react-paystack";
import { toast } from "sonner";
import { Crown, Sparkles, Loader2, X, Check, Zap } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface UpgradeButtonProps {
  plan?: "silver" | "premium";
  className?: string;
  children?: React.ReactNode;
}

export default function UpgradeButtonInner({ plan: defaultPlan, className, children }: UpgradeButtonProps) {
  const { data: session } = useSession();
  const user = session?.user;
  
  const [showModal, setShowModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const currentRole = user?.user_role || "free";
  const currentSub = user?.subscription_status || "free";
  const isAdmin = currentRole === "admin";
  const isPremium = isAdmin || currentRole === "premium" || currentSub === "premium" || currentRole === "pro" || currentSub === "pro";
  const isSilver = currentRole === "silver" || currentSub === "silver";

  const getConfigForPlan = (targetPlan: "silver" | "premium") => {
    const amountNGN = targetPlan === "premium" ? 5000 : 3000;
    const amountKobo = amountNGN * 100;

    return {
      reference: `futurebet_${targetPlan}_${new Date().getTime()}`,
      email: user?.email || "guest@futurebet.com.ng",
      amount: amountKobo,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
      text: targetPlan === "premium" ? "Upgrade to Premium" : "Get Silver",
      metadata: {
        custom_fields: [
          {
            display_name: "Plan",
            variable_name: "plan",
            value: targetPlan,
          },
        ],
      },
      onSuccess: async (reference: any) => {
        setShowModal(false);
        setIsVerifying(true);
        try {
          const res = await fetch("/api/payment/paystack-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              reference: reference.reference,
              plan: targetPlan
            }),
          });

          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(`Welcome to the ${targetPlan.toUpperCase()} plan! 🎉`);
            window.location.reload();
          } else {
            toast.error(data.error || "Verification failed, please contact support.");
            setIsVerifying(false);
          }
        } catch (err) {
          toast.error("An error occurred during verification.");
          setIsVerifying(false);
        }
      },
      onClose: () => {
        toast.info("Payment window closed.");
      },
    };
  };

  const handleInitialClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.error("Please log in to upgrade.");
      return;
    }
    if (!defaultPlan) {
      setShowModal(true);
    }
  };

  const defaultContent = (
    <span className="flex items-center gap-2">
      <Crown className="w-4 h-4" />
      Upgrade Account
    </span>
  );

  const wrapperClass = className || "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50";

  return (
    <>
      {defaultPlan && user ? (
        <PaystackButton
          {...getConfigForPlan(defaultPlan)}
          className={wrapperClass}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
            </span>
          ) : (
            children || defaultContent
          )}
        </PaystackButton>
      ) : (
        <button
          onClick={handleInitialClick}
          disabled={isVerifying}
          className={wrapperClass}
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
            </span>
          ) : (
            children || defaultContent
          )}
        </button>
      )}

      {/* Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-[#0B0F19] border border-slate-800 shadow-[0_0_50px_rgba(37,99,235,0.15)] animate-in fade-in zoom-in-95 duration-300 my-8">
            
            {/* Header */}
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setShowModal(false)} 
                className="rounded-full p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center pt-10 pb-6 px-6">
              <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 text-blue-400">
                <Crown className="w-8 h-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
                Elevate Your Betting Game
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
                Unlock data-driven match intelligence, AI predictions, and mathematical edges. Choose the tier that fits your strategy.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 p-6 pt-0">
              {/* Silver Plan Card */}
              <div className="relative flex flex-col p-6 md:p-8 rounded-2xl border border-slate-700 bg-slate-800/30 hover:border-blue-500/50 transition-all">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-slate-300 font-medium mb-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Silver Tier
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">₦3,000</span>
                    <span className="text-slate-400 text-sm">/ month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>Basic match analysis & form guides</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>Head-to-Head (H2H) statistics</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>Basic automated predictions</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>Limited team comparisons</span>
                  </li>
                </ul>

                </ul>

                {isPremium || isSilver ? (
                  <button disabled className="w-full py-3.5 rounded-xl bg-slate-800 text-slate-500 font-bold cursor-not-allowed border border-slate-700">
                    {isSilver ? "Current Plan" : "Included in Premium"}
                  </button>
                ) : (
                  <PaystackButton
                    {...getConfigForPlan("silver")}
                    className="w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
                  />
                )}
              </div>

              {/* Premium Plan Card */}
              <div className="relative flex flex-col p-6 md:p-8 rounded-2xl border border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-400 transition-all">
                {/* Popular Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full shadow-lg">
                  Most Popular
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-indigo-300 font-medium mb-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    Premium Tier
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">₦5,000</span>
                    <span className="text-indigo-200 text-sm">/ month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-sm text-indigo-100">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span><strong className="text-white">Everything in Silver</strong></span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-100">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>Advanced AI Predictions & Neural Net models</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-100">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>Expected Value (+EV) Targets & Alerts</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-100">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>Full League Data & Standings analytics</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-100">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>Unlimited multi-team comparisons</span>
                  </li>
                </ul>

                </ul>

                {isPremium ? (
                  <button disabled className="w-full py-3.5 rounded-xl bg-indigo-900/40 text-indigo-400 font-bold cursor-not-allowed border border-indigo-500/30">
                    Current Plan
                  </button>
                ) : (
                  <PaystackButton
                    {...getConfigForPlan("premium")}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  />
                )}
              </div>
            </div>
            
            <div className="text-center pb-6 px-6">
              <p className="text-xs text-slate-500">Secure payments processed by Paystack. Cancel anytime.</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
