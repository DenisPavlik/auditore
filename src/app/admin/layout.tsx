import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Il Libro", template: "%s · Il Libro · Auditore" },
  robots: { index: false, follow: false },
};

/** The back of the house: the same paper, none of the fox. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-svh flex-col bg-carta/40">{children}</div>;
}
