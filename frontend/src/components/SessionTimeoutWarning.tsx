import { Button } from "./Button";

export function SessionTimeoutWarning({
  secondsLeft,
  onStaySignedIn,
  onLogoutNow,
}: {
  secondsLeft: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-amber-200 bg-white p-6 shadow-xl">
        <div className="text-sm font-semibold text-slate-900">Your session is about to expire</div>
        <p className="mt-2 text-sm text-slate-600">
          You've been inactive for a while. For security, you'll be signed out in{" "}
          <span className="font-medium text-amber-700">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>{" "}
          unless you stay signed in.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={onStaySignedIn} className="flex-1">
            Stay signed in
          </Button>
          <Button variant="secondary" onClick={onLogoutNow}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
