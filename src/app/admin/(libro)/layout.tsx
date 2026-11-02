import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { signOut } from "@/app/admin/actions";
import { getStaff } from "@/lib/auth";

/** Only staff past this door; the demo account wears its badge. */
async function Door({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/accedi");
  return (
    <>
      <header className="border-b border-ink/10 bg-intonaco/80 px-4 py-3 sm:px-10">
        <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4">
          <Link href="/admin" className="font-display text-xs tracking-[0.28em] uppercase">
            Auditore <span className="text-accent-ink">· Il Libro</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {staff.role === "demo" && (
              <span className="rounded-full bg-accent/15 px-3 py-1 font-display text-[0.62rem] tracking-[0.18em] text-accent-ink uppercase">Demo · read only</span>
            )}
            <span className="hidden text-pietra italic sm:inline">{staff.name}</span>
            <Link href="/" className="text-pietra hover:text-ink">
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
