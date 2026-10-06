import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard><AdminNavigation />{children}</AdminGuard>;
}
