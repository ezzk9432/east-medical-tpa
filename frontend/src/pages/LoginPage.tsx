import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, mfaVerifyRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/Button";
import { Input, Label, Card, CardBody } from "../components/ui";

type Step = "credentials" | "totp";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — MFA
  const [step, setStep] = useState<Step>("credentials");
  const [tempToken, setTempToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Step 1: password submit ──────────────────────────────
  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginRequest(email, password);

      if (result.mfaRequired) {
        // Server wants TOTP — show the second step
        setTempToken(result.tempToken);
        setStep("totp");
        return;
      }

      // No MFA — full session returned directly
      setSession(result.user, result.accessToken, result.refreshToken);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: TOTP submit ──────────────────────────────────
  async function handleTOTP(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await mfaVerifyRequest(tempToken, totpCode);
      setSession(result.user, result.accessToken, result.refreshToken);
      navigate("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Invalid code. Try again.";
      setError(msg);
      setTotpCode(""); // clear so user retypes
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-teal-900 px-4">
      <Card className="w-full max-w-sm">
        <CardBody className="py-8">
          <div className="mb-6 text-center">
            <div className="text-lg font-semibold text-teal-900">East Medical</div>
            <div className="text-sm text-slate-500">Assistance System</div>
          </div>

          {/* ── Step 1: Email + Password ── */}
          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@eastmedical.test"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {/* ── Step 2: TOTP code ── */}
          {step === "totp" && (
            <form onSubmit={handleTOTP} className="space-y-4">
              <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-center">
                <div className="text-sm font-semibold text-teal-800 mb-0.5">
                  Two-factor authentication
                </div>
                <div className="text-xs text-teal-600">
                  Enter the 6-digit code from your authenticator app
                </div>
              </div>

              <div>
                <Label htmlFor="totp">Authenticator code</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  className="tracking-widest text-center font-mono text-lg"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? "Verifying…" : "Verify"}
              </Button>

              <button
                type="button"
                className="w-full text-xs text-slate-400 underline-offset-2 hover:underline"
                onClick={() => {
                  setStep("credentials");
                  setTempToken("");
                  setTotpCode("");
                  setError(null);
                }}
              >
                ← Back to login
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo: layla.hassan@eastmedical.test / Password123!
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
