import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormMessage({ message, variant = "error" }: { message?: string; variant?: "error" | "success" }) {
  if (!message) return null;
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        variant === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {message}
    </div>
  );
}
