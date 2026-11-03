import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAllInventory, getProducts } from "@/lib/data";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [products, inventory] = await Promise.all([getProducts(), getAllInventory()]);
  const mine = inventory.filter((i) => i.tenant_id === session.tenantId);

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">Grocery Hub</Link>
        <Link href="/" className="toplink">View customer page</Link>
      </header>
      <Dashboard tenantName={session.tenantName} products={products} inventory={mine} />
    </div>
  );
}
