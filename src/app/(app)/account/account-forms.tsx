"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { fileToDataUrl } from "@/studio/image-utils";
import { changePassword, updateProfile, type AccountState } from "./actions";

const init: AccountState = {};

export type Profile = { name: string; email: string; phone: string; orgName: string; orgNameEn: string; orgAddress: string; orgPhone: string; orgLogo: string };

export function ProfileForm({ p }: { p: Profile }) {
  const [state, action] = useActionState(updateProfile, init);
  const [logo, setLogo] = useState(p.orgLogo);
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");

  async function pick(f: File | undefined) {
    if (!f) return;
    try {
      const { src } = await fileToDataUrl(f, { max: 500 });
      setLogo(src);
      setErr("");
    } catch {
      setErr("មិនអាចអានរូបភាពបានទេ");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ព័ត៌មានគណនី និងអង្គភាព</CardTitle>
        <CardDescription>ឈ្មោះ Logo អាសយដ្ឋាន ទូរស័ព្ទ ខាងក្រោមនឹងបង្ហាញក្នុងឯកសារដោយស្វ័យប្រវត្តិ ({"{org}"}, {"{orgAddress}"}...)</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="orgLogo" value={logo} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>ឈ្មោះ</Label><Input name="name" defaultValue={p.name} required /></div>
            <div className="space-y-1.5"><Label>អ៊ីមែល</Label><Input value={p.email} disabled /></div>
            <div className="space-y-1.5"><Label>ទូរស័ព្ទ</Label><Input name="phone" defaultValue={p.phone} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>ឈ្មោះអង្គភាព (ខ្មែរ)</Label><Input name="orgName" defaultValue={p.orgName} data-testid="org-name" /></div>
            <div className="space-y-1.5"><Label>ឈ្មោះអង្គភាព (អង់គ្លេស)</Label><Input name="orgNameEn" defaultValue={p.orgNameEn} /></div>
            <div className="space-y-1.5"><Label>អាសយដ្ឋានអង្គភាព</Label><Input name="orgAddress" defaultValue={p.orgAddress} /></div>
            <div className="space-y-1.5"><Label>ទូរស័ព្ទអង្គភាព</Label><Input name="orgPhone" defaultValue={p.orgPhone} /></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="size-6 text-muted-foreground" />}
            </span>
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()}><ImagePlus className="size-4" /> {logo ? "ប្តូរ Logo" : "ដាក់ Logo"}</Button>
            {logo && <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")}><X className="size-4" /> ដកចេញ</Button>}
          </div>
          <FormMessage message={err || state.error} />
          <FormMessage variant="success" message={state.ok} />
          <SubmitButton>រក្សាទុក</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, init);
  return (
    <Card>
      <CardHeader><CardTitle>ប្តូរលេខសម្ងាត់</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>លេខសម្ងាត់បច្ចុប្បន្ន</Label><Input name="current" type="password" required autoComplete="current-password" /></div>
          <div className="space-y-1.5"><Label>លេខសម្ងាត់ថ្មី</Label><Input name="next" type="password" required minLength={6} autoComplete="new-password" /></div>
          <div className="space-y-3 sm:col-span-2">
            <FormMessage message={state.error} />
            <FormMessage variant="success" message={state.ok} />
            <SubmitButton>ប្តូរលេខសម្ងាត់</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
