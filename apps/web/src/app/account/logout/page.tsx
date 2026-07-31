"use client";
// @ts-nocheck
import { useState, useCallback } from "react";
import useAuth from "@/utils/useAuth";

function ConfirmModal({ open, onClose, onConfirm, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="
          relative z-10 w-full max-w-md
          rounded-3xl bg-white p-8
          shadow-2xl ring-1 ring-gray-200
          animate-[fadeIn_0.2s_ease-out]
        "
      >
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Sign out?</h2>
          <p className="mt-2 text-sm text-gray-600">
            You’ll need to sign back in to access your account.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="
              relative flex w-full items-center justify-center
              rounded-xl bg-gradient-to-r from-red-600 to-rose-600
              px-4 py-3 text-base font-medium text-white
              shadow-lg shadow-red-500/20
              transition-all duration-200
              hover:scale-[1.02]
              hover:shadow-xl hover:shadow-red-500/30
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100
            "
          >
            {loading && (
              <span className="absolute left-4 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading ? "Signing Out..." : "Yes, Sign Out"}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="
              w-full rounded-xl border border-gray-300
              px-4 py-3 text-base font-medium text-gray-700
              transition hover:bg-gray-50
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MainComponent() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    await signOut({
      callbackUrl: "/",
      redirect: true,
    });
  }, [signOut]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
          FutureBet
        </h1>

        <button
          onClick={() => setOpen(true)}
          className="
            mt-8 rounded-xl bg-red-600 px-6 py-3
            text-base font-medium text-white
            shadow-lg shadow-red-500/20
            transition hover:bg-red-700
          "
        >
          Sign Out
        </button>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleSignOut}
        loading={loading}
      />
    </div>
  );
}

export default MainComponent;
