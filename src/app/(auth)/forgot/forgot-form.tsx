"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { AuthFrame, type BrandLite } from "@/components/shared/auth-frame";
import { forgotAction, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export function ForgotForm({ mail, brand }: { mail: boolean; brand: BrandLite }) {
  const [state, formAction] = useActionState(forgotAction, initialState);
  return (
    <AuthFrame
      brand={brand}
      title="ភ្លេចលេខសម្ងាត់"
      icon={<KeyRound className="size-6" />}
      description={mail ? "បញ្ចូលអ៊ីមែលដែលបានចុះឈ្មោះ — យើងនឹងផ្ញើតំណសម្រាប់កំណត់លេខសម្ងាត់ថ្មី" : "បញ្ចូលអ៊ីមែលដែលបានចុះឈ្មោះ — យើងនឹងជូនដំណឹងដល់អេដមីនឲ្យកំណត់លេខសម្ងាត់ថ្មីជូនអ្នក"}
    >
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">អ៊ីមែល</Label>
            <Input id="email" name="email" type="email" required autoFocus placeholder="name@example.com" maxLength={200} />
          </div>
          <FormMessage message={state?.error} />
          {state?.ok && <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm" data-testid="forgot-ok">{state.ok}</p>}
          <SubmitButton className="w-full" pendingText="កំពុងបញ្ជូន...">
            {mail ? "ផ្ញើតំណកំណត់លេខសម្ងាត់" : "ស្នើសុំអេដមីនជួយ"}
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline">ត្រឡប់ទៅចូលប្រព័ន្ធ</Link>
          </p>
        </form>
      </CardContent>
    </AuthFrame>
  );
}
