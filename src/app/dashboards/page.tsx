import { requireAdmin } from "../../lib/auth-server";
import ResultsViewBrowser from "../../components/dashboard/ResultsViewBrowser";

export default async function DashboardsIndexPage() {
  await requireAdmin();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <ResultsViewBrowser />
    </section>
  );
}
