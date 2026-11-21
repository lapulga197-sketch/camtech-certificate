"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Hourglass, UserPlus } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { AuthFrame, type BrandLite } from "@/components/shared/auth-frame";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm({ firstAccount, token, brand }: { firstAccount: boolean; token: string; brand: BrandLite }) {
  const [state, formAction] = useActionState(registerAction, initialState);
  return (
    <AuthFrame brand={brand} maxW="max-w-md" title="ចុះឈ្មោះប្រើប្រាស់" icon={<UserPlus className="size-6" />}>
      <CardContent>
        {/* the notice itself runs a coloured light around its edge */}
        <div className="run-border mb-4 flex items-center justify-center gap-2 px-3 py-2 text-center text-sm" data-testid="approval-notice">
          <Hourglass className="size-4 shrink-0 text-primary" />
          <span>{firstAccount ? "គណនីដំបូងគេនឹងក្លាយជាអេដមីនធំ ហើយអាចចូលបានភ្លាម។" : "បន្ទាប់ពីចុះឈ្មោះ ត្រូវរង់ចាំអេដមីនអនុម័តសិន ទើបអាចចូលប្រើបាន។"}</span>
        </div>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="ft" value={token} />
          {/* honeypot: real people never see or fill this */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">ឈ្មោះពេញ</Label>
            <Input id="name" name="name" required autoFocus maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">អ៊ីមែល <span className="text-xs font-normal text-muted-foreground">(ប្រើសម្រាប់ស្រោចស្រង់លេខសម្ងាត់)</span></Label>
            <Input id="email" name="email" type="email" required placeholder="name@example.com" maxLength={200} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">ទូរស័ព្ទ</Label>
              <Input id="phone" name="phone" placeholder="012 345 678" maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgName">ឈ្មោះមជ្ឈមណ្ឌល / អង្គភាព</Label>
              <Input id="orgName" name="orgName" maxLength={160} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">លេខសម្ងាត់</Label>
              <Input id="password" name="password" type="password" required minLength={6} maxLength={200} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">បញ្ជាក់លេខសម្ងាត់</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={6} maxLength={200} autoComplete="new-password" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">កំណត់សម្គាល់ (ជម្រើស)</Label>
            <Textarea id="note" name="note" rows={2} maxLength={300} placeholder="ឧ. ខ្ញុំជាគ្រូនៅ... ចង់ប្រើដើម្បីធ្វើកាតសិស្ស" />
          </div>
          <FormMessage message={state?.error} />
          <SubmitButton className="w-full" pendingText="កំពុងបញ្ជូន...">
            ចុះឈ្មោះ
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            មានគណនីរួចហើយ? <Link href="/login" className="font-medium text-primary underline">ចូលប្រព័ន្ធ</Link>
          </p>
        </form>
      </CardContent>
    </AuthFrame>
  );
}
