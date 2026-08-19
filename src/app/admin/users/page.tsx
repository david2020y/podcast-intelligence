import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth";
import { AdminUsersView } from "@/components/admin/admin-users-view";

export default async function AdminUsersPage() {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }

  return <AdminUsersView />;
}
