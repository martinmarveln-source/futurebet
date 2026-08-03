// @ts-nocheck
"use client";
import { useState, useCallback, useMemo } from "react";
import useAuth from "@/utils/useAuth";

// Reusable input component (reduces duplication)
function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  hint,
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

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function MainComponent() {
  const { signUpWithCredentials } = useAuth();

  // Single object state → cleaner updates + fewer state hooks
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Memoized error map (prevents recreation on re-render)
  const errorMessages = useMemo(
    () => ({
      OAuthSignin: "Couldn't start sign-up. Please try again.",
      OAuthCallback: "Sign-up failed after redirecting.",
      OAuthCreateAccount: "Couldn't create an account with this option.",
      EmailCreateAccount: "This email may already be registered.",
      Callback: "Something went wrong during sign-up.",
      OAuthAccountNotLinked: "This account uses a different sign-in method.",
      CredentialsSignin: "Invalid email or password.",
      AccessDenied: "You don't have permission to sign up.",
      Configuration: "Sign-up isn't working right now.",
      Verification: "Your sign-up link has expired.",
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

      if (!form.name || !form.email || !form.password) {
        setError("Please fill in all fields.");
        return;
      }

      setLoading(true);

      try {
        await signUpWithCredentials({
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
    [form, signUpWithCredentials, errorMessages],
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
            Create your account to get started.
          </p>
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-6">
          <InputField
            label="Name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="John Doe"
          />

          <InputField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />

          <InputField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            hint="Use 8+ characters with a mix of letters & numbers."
          />

          {error && (
            <div
              role="alert"
              className="
                rounded-xl border border-red-200 bg-red-50
                px-4 py-3 text-sm text-red-600
              "
            >
              {error}
            </div>
          )}

          {/* Premium CTA */}
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
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="pt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href={`/account/signin${
                typeof window !== "undefined" ? window.location.search : ""
              }`}
              className="font-medium text-blue-600 transition hover:text-blue-700"
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default MainComponent;
