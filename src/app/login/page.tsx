"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import authBg from "@/assets/img/login-background.png";
import { orderzillaApi } from "@/lib/api";
import { getAuthSession, setAuthSession } from "@/lib/auth/session";

const OAUTH_CLIENT_ID = "dashboard";
const OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ??
  "https://dashboard.orderzilla.ch/auth/callback";
const OAUTH_SCOPE =
  "dashboard:read dashboard:write dashboard:terminals dashboard:loyalty dashboard:admin";

function toBase64Url(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createPkce() {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const codeVerifier = toBase64Url(random.buffer);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = toBase64Url(digest);
  return { codeVerifier, codeChallenge };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getAuthSession();
    if (existing?.accessToken) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      if (!normalizedEmail || !normalizedPassword) {
        setError("Email and password are required.");
        return;
      }

      const { codeVerifier, codeChallenge } = await createPkce();
      const oauthState = crypto.randomUUID();

      const auth = await orderzillaApi.oauth.authorize({
        body: {
          email: normalizedEmail,
          password: normalizedPassword,
          client_id: OAUTH_CLIENT_ID,
          redirect_uri: OAUTH_REDIRECT_URI,
          state: oauthState,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          scope: OAUTH_SCOPE,
        },
      });

      let authCode = auth?.code;
      const redirectUrl = (auth as { redirect?: string } | null)?.redirect;
      if (!authCode && redirectUrl) {
        const parsed = new URL(redirectUrl);
        authCode = parsed.searchParams.get("code") ?? undefined;
      }

      if (!authCode) {
        throw new Error("No authorization code returned");
      }

      const token = await orderzillaApi.oauth.token({
        body: {
          grant_type: "authorization_code",
          client_id: OAUTH_CLIENT_ID,
          redirect_uri: OAUTH_REDIRECT_URI,
          code: authCode,
          code_verifier: codeVerifier,
        },
      });

      if (!token?.access_token) {
        throw new Error("No access token returned");
      }

      setAuthSession({
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type ?? "Bearer",
        expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      });

      router.replace("/dashboard");
    } catch (error) {
      console.error("[auth] Login flow failed", error);
      const message =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ??
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.error ??
        "Invalid email or password.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-4">
      <div className="max-w-5xl w-full flex items-center justify-between gap-12">
        <div className="hidden lg:block flex-1">
            <Image
              src={authBg}
              alt="Self check POS illustration"
              width={520}
              height={820}
              priority
              className="!h-[440px] !w-[500px] object-cover"
            />
        </div>

        <div className="flex-1 max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-xl px-10 py-12">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Admin Login
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Manage your self check POS system
            </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-gray-400 hover:text-gray-600"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-5 h-5"
                    >
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
                      <circle cx="12" cy="12" r="3.5" />
                    </svg>
                  </button>
                </div>
              </div>
              {error ? <p className="text-sm text-[#cf4a4a]">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-full bg-[#d4ff00] py-3.5 text-sm font-semibold text-gray-900 shadow-md hover:bg-[#c4f000] transition"
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

