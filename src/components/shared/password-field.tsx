"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A random, easy-to-read password (no look-alike characters such as 0/O or 1/l/I). */
export function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/**
 * Password input with a show / hide eye, a "generate" button and a copy button.
 * Works uncontrolled inside a form (use `name`) or controlled (`value` + `onValueChange`).
 */
export function PasswordField({
  id,
  name,
  required,
  value,
  onValueChange,
  autoComplete = "new-password",
  placeholder,
}: {
  id?: string;
  name?: string;
  required?: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [inner, setInner] = useState("");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const current = value ?? inner;
  const set = (v: string) => (onValueChange ? onValueChange(v) : setInner(v));

  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the value is visible/selectable anyway */
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        value={current}
        onChange={(e) => set(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button type="button" variant="outline" size="icon" title={visible ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"} onClick={() => setVisible((v) => !v)}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="បង្កើតលេខសម្ងាត់ដោយស្វ័យប្រវត្តិ"
        onClick={() => {
          set(generatePassword());
          setVisible(true);
        }}
      >
        <Wand2 className="size-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" title="ចម្លង" disabled={!current} onClick={() => void copy()}>
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
