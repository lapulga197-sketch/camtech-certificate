"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ registered }: { registered: boolean }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/studio";

  return (
    <div className="gradient-border-wrap w-full max-w-sm shadow-xl">
      <div className="gradient-border-inner">
        <Card className="w-full border-0 shadow-none">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BadgeCheck className="size-6" />
            </div>
            <CardTitle className="text-lg">ស្ទូឌីយោឯកសារ</CardTitle>
            <CardDescription>សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់របស់អ្នក</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              {registered && <FormMessage variant="success" message="បានបញ្ជូនសំណើចុះឈ្មោះ — រង់ចាំអេដមីនអនុម័តសិន ទើបអាចចូលបាន។" />}
              <div className="space-y-1.5">
                <Label htmlFor="email">អ៊ីមែល</Label>
                <Input id="email" name="email" type="email" placeholder="name@example.com" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">លេខសម្ងាត់</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" required />
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
        </Card>
      </div>
    </div>
  );
}
