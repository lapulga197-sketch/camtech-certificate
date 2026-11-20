import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { PasswordForm, ProfileForm } from "./account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const u = await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="គណនីរបស់ខ្ញុំ" />
      <ProfileForm
        p={{
          name: u.name, email: u.email, phone: u.phone ?? "", orgName: u.org_name ?? "", orgNameEn: u.org_name_en ?? "",
          orgAddress: u.org_address ?? "", orgPhone: u.org_phone ?? "", orgLogo: u.org_logo ?? "",
        }}
      />
      <PasswordForm />
    </div>
  );
}
