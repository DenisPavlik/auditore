import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { getStaff } from "@/lib/auth";

/** Only staff past this door; the demo account wears its badge. */
async function Door({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/accedi");
  return (
    <>
      <header className="border-b border-ink/10 bg-intonaco/80 px-4 py-3 sm:px-10">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="hidden font-display text-xs tracking-[0.28em] whitespace-nowrap uppercase lg:inline">
              Auditore <span className="text-accent-ink">· Il Libro</span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4 text-sm whitespace-nowrap">
            {staff.role === "demo" && (
              <span className="rounded-full bg-accent/15 px-3 py-1 font-display text-[0.62rem] tracking-[0.18em] text-accent-ink uppercase">Demo · read only</span>
            )}
            <span className="hidden text-pietra italic lg:inline">{staff.name}</span>
            <Link href="/" className="hidden text-pietra hover:text-ink sm:inline">
              The site
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-pietra hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}

export default function LibroLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="p-10 text-xl text-pietra italic">Opening the book…</p>}>
      <Door>{children}</Door>
    </Suspense>
  );
}
