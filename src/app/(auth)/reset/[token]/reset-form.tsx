"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { AuthFrame, type BrandLite } from "@/components/shared/auth-frame";
import { resetAction, type ResetState } from "./actions";

const initialState: ResetState = {};

export function ResetForm({ token, brand }: { token: string; brand: BrandLite }) {
  const [state, formAction] = useActionState(resetAction, initialState);
  return (
    <AuthFrame brand={brand} title="កំណត់លេខសម្ងាត់ថ្មី" icon={<KeyRound className="size-6" />}>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-1.5">
            <Label htmlFor="password">លេខសម្ងាត់ថ្មី</Label>
            <Input id="password" name="password" type="password" required minLength={6} maxLength={200} autoComplete="new-password" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">បញ្ជាក់លេខសម្ងាត់</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={6} maxLength={200} autoComplete="new-password" />
          </div>
          <FormMessage message={state?.error} />
          <SubmitButton className="w-full" pendingText="កំពុងរក្សាទុក...">រក្សាទុកលេខសម្ងាត់ថ្មី</SubmitButton>
        </form>
      </CardContent>
    </AuthFrame>
  );
}
