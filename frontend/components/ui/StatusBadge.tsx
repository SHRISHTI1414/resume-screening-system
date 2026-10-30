import {
  Award,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock,
  FileEdit,
  Lock,
  MessagesSquare,
  Star,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  success: "bg-green-50 text-green-800 ring-green-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

// Each state has its own icon and label, so that nothing depends on color alone.
const STATES: Record<string, { tone: Tone; icon: LucideIcon }> = {
  Active: { tone: "success", icon: CircleCheck },
  Closed: { tone: "neutral", icon: Lock },
  Draft: { tone: "warning", icon: FileEdit },

  New: { tone: "neutral", icon: CircleDashed },
  "Under Review": { tone: "info", icon: Clock },
  Shortlisted: { tone: "success", icon: Star },
  Interview: { tone: "info", icon: MessagesSquare },
  Rejected: { tone: "danger", icon: CircleX },
  Hired: { tone: "success", icon: Award },

  "Excellent Match": { tone: "success", icon: Award },
  "Strong Match": { tone: "success", icon: ThumbsUp },
  "Good Match": { tone: "info", icon: CircleCheck },
  Review: { tone: "warning", icon: CircleAlert },
  "Weak Match": { tone: "danger", icon: CircleX },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { tone, icon: Icon } = STATES[status] ?? { tone: "neutral" as Tone, icon: CircleDot };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {status}
    </span>
  );
}
