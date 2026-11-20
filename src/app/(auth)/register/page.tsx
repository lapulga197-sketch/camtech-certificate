import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { countUsers } from "@/lib/users";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  let first = false;
  try {
    if (await currentUser()) redirect("/studio");
    first = !process.env.ADMIN_EMAIL && (await countUsers()) === 0;
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <RegisterForm firstAccount={first} />
    </div>
  );
}
