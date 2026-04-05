import ClientHeader from "@/components/client-header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />

      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}