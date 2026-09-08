import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <Dashboard initialData={await getDashboardData()} />;
}
