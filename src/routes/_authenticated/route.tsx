import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, PlusCircle, LogOut, Factory, Menu, Search, Bell, ScrollText, Package, Sparkles, Blocks, LayoutTemplate, Home,
  Briefcase, ShoppingCart, CalendarClock, MapPin, PieChart, UserCog, Building2, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

type NavItem = { to: string; label: string; icon: any; highlight?: boolean };
const CRM_NAV: NavItem[] = [
  { to: "/crm", label: "CRM Dashboard", icon: PieChart },
  { to: "/crm/leads", label: "Leads", icon: Target },
  { to: "/crm/products", label: "Products", icon: Package },
  { to: "/crm/quotations", label: "Quotations", icon: FileText },
  { to: "/crm/orders", label: "Orders", icon: ShoppingCart },
  { to: "/crm/followups", label: "Follow-ups", icon: CalendarClock },
  { to: "/crm/companies", label: "Companies", icon: Building2 },
  { to: "/crm/tours", label: "Tour Planner", icon: MapPin },
  { to: "/crm/admin/users", label: "Users & Roles", icon: UserCog },
];
const PROPOSAL_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Proposal Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/proposals/new", label: "New Proposal", icon: PlusCircle, highlight: true },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/settings/products", label: "Machines", icon: Briefcase },
  { to: "/settings/rules", label: "Auto-Select", icon: Sparkles },
  { to: "/settings/content", label: "Content", icon: Blocks },
  { to: "/settings/terms", label: "Terms", icon: ScrollText },
];



function AppShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const email = user.email ?? "user";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center font-bold text-primary-foreground">
            RSF
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Rameshwar Steel Fab</div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">RSF CRM</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider opacity-60">CRM</div>
          {CRM_NAV.map((item: NavItem) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/crm" && pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 opacity-90",
                )}>
                <Icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
          <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider opacity-60">Proposal Suite</div>
          {PROPOSAL_NAV.map((item: NavItem) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/dashboard" && item.to !== "/" && pathname.startsWith(item.to) && item.to !== "/proposals/new");
            return (
              <Link key={item.to} to={item.to}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 opacity-90",
                  item.highlight && !active && "text-sidebar-primary-foreground bg-sidebar-primary/30 hover:bg-sidebar-primary/50",
                )}>
                <Icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{email}</div>
              <div className="text-[10px] opacity-60">Sales Engineer</div>
            </div>
            <button onClick={signOut} title="Sign out" className="p-1.5 rounded-md hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b h-16 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative flex-1 min-w-0 max-w-xl">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9 bg-secondary/60 border-transparent" />
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 hidden sm:inline-flex"><Bell className="h-5 w-5" /></Button>
          <Button asChild size="sm" className="gradient-primary shrink-0">
            <Link to="/proposals/new">
              <PlusCircle className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">New Proposal</span>
            </Link>
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
