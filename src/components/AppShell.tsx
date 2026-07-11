"use client";

import { auth, firebaseConfigured } from "@/app/firebase/firebaseConfig";
import BrandLogo from "@/components/BrandLogo";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  FileText,
  Home,
  LogOut,
  Map,
  Mic2,
  Settings,
} from "lucide-react";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Home", href: "/dashboard/student", icon: Home },
  { label: "Roadmap", href: "/dashboard/student/roadmap", icon: Map },
  { label: "Careers", href: "/dashboard/student/careerpath", icon: BriefcaseBusiness },
  { label: "Resume", href: "/dashboard/student/resume", icon: FileText },
  { label: "Interview", href: "/dashboard/student/mockinterview", icon: Mic2 },
  { label: "Mentor", href: "/dashboard/student/chat", icon: Bot },
  { label: "Progress", href: "/dashboard/student/progress", icon: ChartNoAxesCombined },
];

const mobileNavigation = [
  navigation[0],
  navigation[1],
  navigation[5],
  navigation[4],
  { label: "Profile", href: "/dashboard/student/settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard/student" && pathname.startsWith(href));

  const handleLogout = async () => {
    if (firebaseConfigured) await signOut(auth);
    window.location.href = "/auth/login";
  };

  return (
    <div className="cosmic-bg min-h-screen overflow-x-hidden text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-sky-300/[.1] bg-[#040b1c]/80 py-5 backdrop-blur-2xl md:flex">
        <BrandLogo compact />

        <nav aria-label="Primary navigation" className="mt-9 flex flex-1 flex-col gap-2">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`relative grid h-11 w-11 place-items-center rounded-lg transition ${
                  active
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-slate-500 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                {active && <span className="nav-active-pulse absolute -left-[17px] h-5 w-[3px] rounded-r bg-blue-500" />}
                <Icon size={20} />
              </Link>
            );
          })}
        </nav>

        <Link
          title="Settings"
          aria-label="Settings"
          href="/dashboard/student/settings"
          className="grid h-11 w-11 place-items-center text-slate-500 hover:text-white"
        >
          <Settings size={20} />
        </Link>
        <button
          title="Log out"
          aria-label="Log out"
          onClick={handleLogout}
          className="grid h-11 w-11 place-items-center text-slate-500 hover:text-rose-400"
        >
          <LogOut size={20} />
        </button>
      </aside>

      <div className="min-w-0 md:pl-[76px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sky-300/[.1] bg-[#030817]/70 px-4 backdrop-blur-2xl md:px-8">
          <div className="md:hidden"><BrandLogo /></div>
          <p className="hidden text-sm text-slate-500 md:block">Your future, made clearer.</p>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/dashboard/student/chat" className="secondary-btn !min-h-9 !px-3 text-sm">
              <Bot size={15} className="text-blue-400" />
              <span className="hidden sm:inline">Ask Aspire</span>
            </Link>
            <button className="icon-btn !h-9 !w-9" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <Link
              href="/dashboard/student/settings"
              aria-label="Profile and settings"
              className="grid h-9 w-9 place-items-center rounded-full bg-blue-500/15 text-sm font-bold text-blue-300"
            >
              JD
            </Link>
          </div>
        </header>

        <div className="min-h-[calc(100vh-4rem)] min-w-0 overflow-x-hidden">{children}</div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[72px] items-center justify-around border-t border-sky-300/[.12] bg-[#040b1c]/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
      >
        {mobileNavigation.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[52px] flex-col items-center gap-1 text-[10px] ${
                active ? "text-blue-400" : "text-slate-500"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
