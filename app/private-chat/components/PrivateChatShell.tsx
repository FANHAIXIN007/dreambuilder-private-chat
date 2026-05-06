"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type PrivateChatShellProps = {
 title: string;
 subtitle?: string;
 rightSlot?: ReactNode;
 onMobileTitleClick?: () => void;
 children: ReactNode;
};

export default function PrivateChatShell({
 title,
 subtitle,
 rightSlot,
 onMobileTitleClick,
 children,
}: PrivateChatShellProps) {
 return (
 <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,#1e1b4b_0,#020617_42%,#020617_100%)] text-white">
 <div className="mx-auto flex h-full w-full max-w-none flex-col px-2 py-2 sm:px-4 sm:py-4 xl:max-w-[1500px] 2xl:max-w-[1680px]">
 <header className="mb-2 shrink-0 rounded-[1.75rem] border border-white/10 bg-slate-950/60 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur sm:mb-4 sm:rounded-[2rem] sm:px-5 sm:py-4">
 <div className="flex items-center justify-between gap-3">
 <div className="flex min-w-0 items-center gap-3">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl sm:h-12 sm:w-12">
 💬
 </div>

 <div className="min-w-0">
 {onMobileTitleClick ? (
 <button
  type="button"
  onClick={onMobileTitleClick}
  className="block max-w-full truncate text-left text-xl font-semibold tracking-tight text-white transition hover:text-fuchsia-100 active:text-fuchsia-200 sm:text-2xl lg:pointer-events-none"
  title="打开大厅信息"
 >
  {title}
 </button>
) : (
 <h1 className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
  {title}
 </h1>
)}

 {subtitle ? (
 <p className="mt-1 truncate text-xs leading-5 text-slate-400 sm:text-sm">
 {subtitle}
 </p>
 ) : null}
 </div>
 </div>

 <div className="flex shrink-0 items-center gap-2">
 {rightSlot}

 <Link
 href="/"
 className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white sm:inline-flex"
 >
 返回首页
 </Link>
 </div>
 </div>
 </header>

 <div className="min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-2xl shadow-black/40 backdrop-blur sm:rounded-[2rem]">
 {children}
 </div>
 </div>
 </main>
 );
}