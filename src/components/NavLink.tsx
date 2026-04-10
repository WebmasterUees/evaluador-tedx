"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  exact?: boolean;
};

export default function NavLink({ href, children, exact = false }: Props) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const baseClass = "rounded-lg px-3 py-2 text-sm font-semibold transition";
  const activeClass = "bg-slate-900 text-white shadow-sm";
  const inactiveClass = "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100";

  return (
    <Link href={href} className={`${baseClass} ${active ? activeClass : inactiveClass}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}