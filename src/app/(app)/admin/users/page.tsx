import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, type UserItem } from "./users-table";

export const dynamic = "force-dynamic";

type Row = {
  id: string; name: string; email: string; phone: string | null; role: UserItem["role"]; status: UserItem["status"];
  note: string | null; org_name: string | null; created_at: Date; last_login_at: Date | null; reset_requested_at: Date | null;
};

export default async function UsersPage() {
  const me = await requireAdmin();
  const rows = await query<Row>(
    `SELECT id, name, email, phone, role, status, note, org_name, created_at, last_login_at, reset_requested_at
     FROM app_user ORDER BY (status = 'PENDING') DESC, (reset_requested_at IS NOT NULL) DESC, created_at DESC LIMIT 500`
  );
  const users: UserItem[] = rows.map((r) => ({
    id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role, status: r.status, note: r.note, orgName: r.org_name,
    createdAt: new Date(r.created_at).toISOString(), lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    resetRequestedAt: r.reset_requested_at ? new Date(r.reset_requested_at).toISOString() : null,
  }));
  return (
    <div>
      <PageHeader title="អ្នកប្រើប្រាស់" description="អនុម័ត ឬបដិសេធសំណើចុះឈ្មោះ — អ្នកដែលមិនទាន់អនុម័តមិនអាចចូលប្រើបានទេ" />
      <UsersTable users={users} meId={me.id} meRole={me.role} />
    </div>
  );
}
