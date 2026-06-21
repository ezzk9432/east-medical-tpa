import type { CaseActivity } from "../types";
import { formatDate } from "./format";

export function ActivityFeed({ activities }: { activities: CaseActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {activities.map((a) => (
        <li key={a.id} className="border-l-2 border-teal-200 pl-3">
          <div className="text-slate-700">{a.message}</div>
          <div className="text-xs text-slate-400">{formatDate(a.createdAt)}</div>
        </li>
      ))}
    </ul>
  );
}
