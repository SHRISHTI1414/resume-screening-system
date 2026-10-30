import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r lg:block">
        <Sidebar />
      </aside>
      <TopNavbar />
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">{children}</main>
    </div>
  );
}
