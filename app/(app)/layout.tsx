import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
