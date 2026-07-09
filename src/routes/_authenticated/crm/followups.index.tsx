import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crm/followups/")({
  component: FollowupsPage,
});

function FollowupsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");

  const fu = useQuery({
    queryKey: ["crm_fu"],
    queryFn: async () => (await (supabase as any).from("crm_followups").select("*, crm_leads(company_name)").order("due_date")).data ?? [],
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: any) => { const { error } = await (supabase as any).from("crm_followups").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_fu"] }); toast.success("Updated"); },
  });

  const today = new Date().toISOString().slice(0, 10);
  const rows = fu.data ?? [];
  const overdue = rows.filter((f: any) => f.status === "Pending" && f.due_date < today);
  const todayItems = rows.filter((f: any) => f.status === "Pending" && f.due_date === today);
  const upcoming = rows.filter((f: any) => f.status === "Pending" && f.due_date > today);
  const done = rows.filter((f: any) => f.status === "Completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Follow-ups</h1>
        <div className="flex border rounded-md">
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}>List</Button>
          <Button variant={view === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setView("calendar")}>Calendar</Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Overdue" tone="danger" items={overdue} onToggle={toggle.mutate} />
          <Section title="Today" tone="warn" items={todayItems} onToggle={toggle.mutate} />
          <Section title="Upcoming" tone="info" items={upcoming} onToggle={toggle.mutate} />
          <Section title="Completed" tone="success" items={done} onToggle={toggle.mutate} />
        </div>
      ) : (
        <CalendarView items={rows} onToggle={toggle.mutate} />
      )}
    </div>
  );
}

function Section({ title, tone, items, onToggle }: any) {
  const toneClass = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-primary";
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className={cn("text-base", toneClass)}>{title}</CardTitle>
        <Badge variant="secondary">{items.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((f: any) => (
          <div key={f.id} className="flex items-start justify-between gap-2 border rounded-md p-2 text-sm">
            <div>
              <div className={f.status === "Completed" ? "line-through opacity-60" : ""}>{f.description}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {f.crm_leads && <Link to="/crm/leads/$id" params={{ id: f.lead_id }} className="hover:text-primary">{f.crm_leads.company_name}</Link>}
                {" · "}Due {f.due_date}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => onToggle({ id: f.id, status: f.status === "Pending" ? "Completed" : "Pending" })}>
              <CheckCircle2 className={cn("h-4 w-4", f.status === "Completed" && "text-emerald-600")} />
            </Button>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-3">Nothing here</div>}
      </CardContent>
    </Card>
  );
}

function CalendarView({ items, onToggle }: any) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const startDay = first.getDay();
  const grid: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(d);

  const byDay: Record<string, any[]> = {};
  items.forEach((it: any) => {
    const key = it.due_date;
    (byDay[key] ||= []).push(it);
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" />{now.toLocaleString("en-US", { month: "long", year: "numeric" })}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="p-2 text-center font-semibold text-muted-foreground">{d}</div>)}
          {grid.map((d, i) => {
            const key = d ? `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
            const list = d ? (byDay[key] ?? []) : [];
            const isToday = d === now.getDate();
            return (
              <div key={i} className={cn("border rounded p-1 min-h-[80px]", isToday && "bg-primary/5 border-primary")}>
                {d && <div className="text-xs font-semibold mb-1">{d}</div>}
                {list.slice(0, 3).map((f: any) => (
                  <div key={f.id} className={cn("text-[10px] px-1 py-0.5 rounded mb-0.5 truncate", f.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-primary/10 text-primary")}>{f.description}</div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-muted-foreground">+{list.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
