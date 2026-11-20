"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText = "កំពុងរក្សាទុក...",
  className,
  variant,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingText : children}
    </Button>
  );
}
