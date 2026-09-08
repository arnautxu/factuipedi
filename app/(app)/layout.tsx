import { FeedbackProvider } from "@/components/ui/ActionFeedback";
import { requireSession } from "@/lib/auth/require-session";
import Navbar from "@/components/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-6"><FeedbackProvider>{children}</FeedbackProvider></main>
    </div>
  );
}
