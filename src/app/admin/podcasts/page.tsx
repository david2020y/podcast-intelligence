import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth";
import { AdminPodcastsView } from "@/components/admin/admin-podcasts-view";

// Server-side gate: a non-admin hitting this URL directly gets the same 404 as any other
// nonexistent route, rather than a 403 that would confirm the page exists. The API route
// underneath enforces the same check independently — this page-level check just keeps a
// non-admin from ever seeing the shell render.
export default async function AdminPodcastsPage() {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }

  return <AdminPodcastsView />;
}
