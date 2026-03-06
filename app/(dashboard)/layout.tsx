import { SignOutButton } from "@/components/auth/SignOutButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r bg-muted/40 p-4">
        <nav className="flex-1 space-y-2">
          <h2 className="text-lg font-semibold">Command Center</h2>
          <p className="text-sm text-muted-foreground">Navigation placeholder</p>
        </nav>
        <SignOutButton />
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
