import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { Card, CardBody, CardHeader } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";

type Step = "intro" | "qr" | "confirm" | "done";

export function MFASetupPage() {
  const [step, setStep] = useState<Step>("intro");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const setupMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.get("/auth/mfa/setup");
      return data as { qrDataUrl: string; backupCodes: string[] };
    },
    onSuccess: (data) => {
      setQrDataUrl(data.qrDataUrl);
      setBackupCodes(data.backupCodes);
      setStep("qr");
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Setup failed"),
  });

  const confirmMut = useMutation({
    mutationFn: async () => {
      await api.post("/auth/mfa/verify-setup", { token });
    },
    onSuccess: () => setStep("done"),
    onError: (e: any) => setError(e?.response?.data?.error ?? "Verification failed"),
  });

  return (
    <div className="p-8 max-w-lg">
      <PageHeader
        title="Two-Factor Authentication"
        subtitle="Add an extra layer of security to your account"
      />

      {step === "intro" && (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">
              Enable TOTP-based 2FA using an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong>.
              Once enabled, you'll need a 6-digit code from your app at every login.
            </p>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button onClick={() => setupMut.mutate()} disabled={setupMut.isPending}>
              {setupMut.isPending ? "Generating…" : "Set up 2FA"}
            </Button>
          </CardBody>
        </Card>
      )}

      {step === "qr" && (
        <Card>
          <CardHeader className="font-medium text-slate-700">Scan this QR code</CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">
              Scan the QR code with your authenticator app, then enter the 6-digit code below to confirm setup.
            </p>
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="MFA QR Code" className="w-48 h-48 rounded-lg border border-slate-200 p-2" />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Backup codes (save these!)</p>
              <div className="grid grid-cols-2 gap-1">
                {backupCodes.map((code) => (
                  <code key={code} className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">{code}</code>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Each code can only be used once if you lose access to your authenticator app.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-digit code to confirm</label>
              <input
                type="text"
                maxLength={6}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tracking-widest"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button
              onClick={() => confirmMut.mutate()}
              disabled={token.length !== 6 || confirmMut.isPending}
            >
              {confirmMut.isPending ? "Verifying…" : "Enable 2FA"}
            </Button>
          </CardBody>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardBody className="text-center space-y-3 py-8">
            <div className="text-4xl">✅</div>
            <h2 className="text-lg font-semibold text-slate-900">2FA is now active</h2>
            <p className="text-sm text-slate-500">
              Your account is protected. You'll be asked for a code on every login.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
