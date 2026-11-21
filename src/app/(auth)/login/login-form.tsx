"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { AuthFrame, type BrandLite } from "@/components/shared/auth-frame";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ registered, reset, brand }: { registered: boolean; reset: boolean; brand: BrandLite }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/studio";

  return (
    <AuthFrame brand={brand} title="ចូលប្រព័ន្ធ" description="សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់របស់អ្នក">
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          {registered && <FormMessage variant="success" message="បានបញ្ជូនសំណើចុះឈ្មោះ — រង់ចាំអេដមីនអនុម័តសិន ទើបអាចចូលបាន។" />}
          {reset && <FormMessage variant="success" message="បានប្តូរលេខសម្ងាត់ហើយ — សូមចូលដោយលេខសម្ងាត់ថ្មី។" />}
          <div className="space-y-1.5">
            <Label htmlFor="email">អ៊ីមែល</Label>
            <Input id="email" name="email" type="email" placeholder="name@example.com" required autoFocus autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">លេខសម្ងាត់</Label>
              <Link href="/forgot" className="text-xs text-primary underline" data-testid="forgot-link">ភ្លេចលេខសម្ងាត់?</Link>
            </div>
            <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <FormMessage message={state?.error} />
          {state?.info && <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{state.info}</p>}
          <SubmitButton className="w-full" pendingText="កំពុងចូល...">
            ចូលប្រព័ន្ធ
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            មិនទាន់មានគណនី? <Link href="/register" className="font-medium text-primary underline">ចុះឈ្មោះ</Link>
          </p>
        </form>
      </CardContent>
    </AuthFrame>
  );
}
