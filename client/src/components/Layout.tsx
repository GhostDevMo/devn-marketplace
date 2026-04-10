import ClientHeader from "@/components/client-header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ClientHeader />

      <main className="flex-1 overflow-y-auto pt-20 pb-24">
        {children}
      </main>
    </div>
  );
}