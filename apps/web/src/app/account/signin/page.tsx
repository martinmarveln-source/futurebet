// @ts-nocheck
"use client";
import { useState, useCallback, useMemo } from "react";
import useAuth from "@/utils/useAuth";

// Reusable input field component (reduces duplication + improves maintainability)
function InputField({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="group relative">
        <input
          id={name}
          required
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="
            w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base
            outline-none transition-all duration-200
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            group-hover:border-gray-400
          "
        />
      </div>
    </div>
  );
}

function MainComponent() {
  const { signInWithCredentials } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" }); // cleaner state object
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const errorMessages = useMemo(
    () => ({
      OAuthSignin:
        "Couldn't start sign-in. Please try again or use a different method.",
      OAuthCallback: "Sign-in failed after redirecting. Please try again.",
      OAuthCreateAccount:
        "Couldn't create an account with this sign-in method.",
      EmailCreateAccount: "This email can't be used to create an account.",
      Callback: "Something went wrong during sign-in.",
      OAuthAccountNotLinked:
        "This account is linked to a different sign-in method.",
      CredentialsSignin: "Incorrect email or password. Try again or reset it.",
      AccessDenied: "You don't have permission to sign in.",
      Configuration: "Sign-in isn't working right now. Please try again later.",
      Verification: "Your sign-in link has expired.",
    }),
    [],
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);

      if (!form.email || !form.password) {
        setError("Please fill in all fields.");
        return;
      }

      setLoading(true);

      try {
        await signInWithCredentials({
          ...form,
          callbackUrl: "/",
          redirect: true,
        });
      } catch (err) {
        setError(
          errorMessages[err.message] ||
            "Something went wrong. Please try again.",
        );
        setLoading(false);
      }
    },
    [form, signInWithCredentials, errorMessages],
  );

  return (
    <div
      className="
        flex min-h-screen items-center justify-center p-6
        bg-gradient-to-br from-slate-50 via-white to-slate-100
      "
    >
      <div
        className="
          w-full max-w-md
          rounded-3xl bg-white/80 backdrop-blur-xl
          shadow-2xl shadow-slate-200/60
          ring-1 ring-gray-200
          p-10
        "
      >
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
            FutureBet
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Welcome back. Please sign in to continue.
          </p>
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-6">
          <InputField
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />

          <InputField
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          {/* Error State (more refined + accessible) */}
          {error && (
            <div
              role="alert"
              className="
                rounded-xl border border-red-200 bg-red-50 px-4 py-3
                text-sm text-red-600
              "
            >
              {error}
            </div>
          )}

          {/* CTA Button with spinner */}
          <button
            type="submit"
            disabled={loading}
            className="
              relative flex w-full items-center justify-center
              rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600
              px-4 py-3 text-base font-medium text-white
              shadow-lg shadow-blue-500/20
              transition-all duration-200
              hover:shadow-xl hover:shadow-blue-500/30
              hover:scale-[1.01]
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100
            "
          >
            {loading && (
              <span className="absolute left-4 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {/* Footer */}
          <p className="pt-2 text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <a
              href={`/account/signup${
                typeof window !== "undefined" ? window.location.search : ""
              }`}
              className="font-medium text-blue-600 transition hover:text-blue-700"
            >
              Create one
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default MainComponent;
