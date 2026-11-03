import Link from "next/link";
import SearchClient from "@/components/SearchClient";

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">Grocery Hub</Link>
        <Link href="/login" className="toplink">Store owner sign in</Link>
      </header>
      <SearchClient />
    </div>
  );
}
