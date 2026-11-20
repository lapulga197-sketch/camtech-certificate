"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm({ firstAccount }: { firstAccount: boolean }) {
  const [state, formAction] = useActionState(registerAction, initialState);
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <UserPlus className="size-6" />
        </div>
        <CardTitle className="text-lg">ចុះឈ្មោះប្រើប្រាស់ស្ទូឌីយោ</CardTitle>
        <CardDescription>
          {firstAccount
            ? "គណនីដំបូងគេនឹងក្លាយជាអេដមីនធំ ហើយអាចចូលបានភ្លាម។"
            : "បន្ទាប់ពីចុះឈ្មោះ ត្រូវរង់ចាំអេដមីនអនុម័តសិន ទើបអាចចូលប្រើបាន។"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">ឈ្មោះពេញ</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">អ៊ីមែល</Label>
            <Input id="email" name="email" type="email" required placeholder="name@example.com" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">ទូរស័ព្ទ</Label>
              <Input id="phone" name="phone" placeholder="012 345 678" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgName">ឈ្មោះមជ្ឈមណ្ឌល / អង្គភាព</Label>
              <Input id="orgName" name="orgName" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">លេខសម្ងាត់</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">បញ្ជាក់លេខសម្ងាត់</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">កំណត់សម្គាល់ (ជម្រើស)</Label>
            <Textarea id="note" name="note" rows={2} placeholder="ឧ. ខ្ញុំជាគ្រូនៅ... ចង់ប្រើដើម្បីធ្វើកាតសិស្ស" />
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
    </Card>
  );
}
