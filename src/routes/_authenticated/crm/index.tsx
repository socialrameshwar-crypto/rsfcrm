import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtINR, region, LEAD_STAGES } from "@/lib/crm";
import { Target, FileText, TrendingUp, AlertCircle } from "lucide-react";
import {
  PieChart as RePie, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/crm/")({
  component: CrmDashboard,
});

const COLORS = ["#C0272D", "#1E6FD9", "#16A34A", "#EAB308", "#8B5CF6"];

function CrmDashboard() {
  const leads = useQuery({
    queryKey: ["crm_leads_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_leads").select("*");
      if (error) throw error; return data ?? [];
    },
  });
  const quotes = useQuery({
    queryKey: ["crm_quotes_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_quotations").select("*");
      if (error) throw error; return data ?? [];
    },
  });
  const items = useQuery({
    queryKey: ["crm_qitems_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_quotation_items").select("*");
      if (error) throw error; return data ?? [];
    },
  });
  const followups = useQuery({
    queryKey: ["crm_fu_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_followups").select("*");
      if (error) throw error; return data ?? [];
    },
  });

  const L = leads.data ?? [];
  const Q = quotes.data ?? [];
  const I = items.data ?? [];
  const F = followups.data ?? [];

  // Leads MoM
  const now = new Date();
  const thisMonth = L.filter((l: any) => new Date(l.created_at).getMonth() === now.getMonth() && new Date(l.created_at).getFullYear() === now.getFullYear()).length;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
  const lastMonth = L.filter((l: any) => new Date(l.created_at).getMonth() === lastMonthDate.getMonth() && new Date(l.created_at).getFullYear() === lastMonthDate.getFullYear()).length;
  const mom = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth ? 100 : 0);

  const won = L.filter((l: any) => l.stage === "Won").length;
  const conv = L.length ? Math.round((won / L.length) * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const overdue = F.filter((f: any) => f.status === "Pending" && f.due_date < today).length;

  // Region split by lead count
  const regionMap: Record<string, number> = {};
  L.forEach((l: any) => { const r = region(l.country); regionMap[r] = (regionMap[r] || 0) + 1; });
  const regionData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

  // Top 5 products
  const prodMap: Record<string, number> = {};
  I.forEach((it: any) => { prodMap[it.product_name] = (prodMap[it.product_name] || 0) + 1; });
  const topProducts = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

  // Revenue trend from Won leads' quote grand_total by month
  const wonLeadIds = new Set(L.filter((l: any) => l.stage === "Won").map((l: any) => l.id));
  const wonQuotes = Q.filter((q: any) => wonLeadIds.has(q.lead_id));
  const monthMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i);
    monthMap[d.toLocaleString("en-US", { month: "short" })] = 0;
  }
  wonQuotes.forEach((q: any) => {
    const d = new Date(q.quote_date);
    const key = d.toLocaleString("en-US", { month: "short" });
    if (key in monthMap) monthMap[key] += Number(q.grand_total || 0);
  });
  const revenue = Object.entries(monthMap).map(([month, value]) => ({ month, value }));

  // Stage counts
  const stageCounts = LEAD_STAGES.map(s => ({ stage: s, count: L.filter((l: any) => l.stage === s).length }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground">Rameshwar Steel Fab — Sales overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Leads this month" value={thisMonth} sub={`${mom >= 0 ? "+" : ""}${mom}% vs last month`} tone={mom >= 0 ? "up" : "down"} />
        <StatCard icon={TrendingUp} label="Conversion rate" value={`${conv}%`} sub={`${won} won of ${L.length}`} />
        <StatCard icon={FileText} label="Quotations" value={Q.length} sub={`${Q.filter((q: any) => q.status === "Sent").length} sent`} />
        <StatCard icon={AlertCircle} label="Overdue follow-ups" value={overdue} sub="Needs action" tone={overdue > 0 ? "warn" : "ok"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Region-wise leads</CardTitle></CardHeader>
          <CardContent className="h-72">
            {regionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie data={regionData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </RePie>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 products by quotations</CardTitle></CardHeader>
          <CardContent className="h-72">
            {topProducts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip /><Bar dataKey="count" fill="#C0272D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue trend (Won deals, last 6 months)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" /><YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <Line type="monotone" dataKey="value" stroke="#C0272D" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline by stage</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {stageCounts.map(s => (
              <Link key={s.stage} to="/crm/leads" className="border rounded-lg p-3 hover:border-primary transition">
                <div className="text-xs text-muted-foreground">{s.stage}</div>
                <div className="text-2xl font-bold">{s.count}</div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {overdue > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Overdue follow-ups</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {F.filter((f: any) => f.status === "Pending" && f.due_date < today).slice(0, 5).map((f: any) => (
                <li key={f.id}>• {f.description} <span className="text-muted-foreground">— due {f.due_date}</span></li>
              ))}
            </ul>
            <Link to="/crm/followups" className="text-sm text-primary underline mt-3 inline-block">View all follow-ups →</Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${tone === "warn" ? "text-destructive" : tone === "up" ? "text-emerald-600" : tone === "down" ? "text-destructive" : "text-primary"}`} />
        </div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
function Empty() { return <div className="h-full grid place-items-center text-sm text-muted-foreground">No data yet</div>; }
