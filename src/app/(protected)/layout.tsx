import { BottomNav } from "@/components/layout/bottom-nav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
