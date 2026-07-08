import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/format";
import {
  FileText, TrendingUp, Trophy, XCircle, Clock, Users, DollarSign, Percent, CalendarClock, PlusCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: proposals }, { data: customers }] = await Promise.all([
        supabase.from("proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
      ]);
      return { proposals: proposals ?? [], customers: customers ?? [] };
    },
  });

  const proposals = data?.proposals ?? [];
  const customers = data?.customers ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = proposals.filter(p => p.created_at?.slice(0, 10) === today).length;
  const won = proposals.filter(p => p.status === "won");
  const lost = proposals.filter(p => p.status === "lost");
  const pending = proposals.filter(p => ["draft", "sent", "negotiation"].includes(p.status));
  const totalValue = proposals.reduce((s, p) => s + Number(p.total_value || 0), 0);
  const wonValue = won.reduce((s, p) => s + Number(p.total_value || 0), 0);
  const closed = won.length + lost.length;
  const conversion = closed ? Math.round((won.length / closed) * 100) : 0;

  // Monthly trend last 6 months
  const months: { month: string; count: number; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short" });
    const items = proposals.filter(p => p.created_at?.slice(0, 7) === key);
    months.push({ month: label, count: items.length, value: items.reduce((s, p) => s + Number(p.total_value || 0), 0) });
  }

  const funnel = [
    { stage: "Draft", count: proposals.filter(p => p.status === "draft").length },
    { stage: "Sent", count: proposals.filter(p => p.status === "sent").length },
    { stage: "Negotiation", count: proposals.filter(p => p.status === "negotiation").length },
    { stage: "Won", count: won.length },
    { stage: "Lost", count: lost.length },
  ];

  const productAgg = proposals.reduce<Record<string, number>>((m, p) => {
    m[p.product_type] = (m[p.product_type] || 0) + 1; return m;
  }, {});
  const productData = Object.entries(productAgg).map(([name, value]) => ({ name, value }));

  const countryAgg = customers.reduce<Record<string, number>>((m, c) => {
    if (c.country) m[c.country] = (m[c.country] || 0) + 1; return m;
  }, {});
  const countryData = Object.entries(countryAgg).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const upcoming = proposals
    .filter(p => p.follow_up_date && new Date(p.follow_up_date) >= new Date(today))
    .sort((a, b) => a.follow_up_date!.localeCompare(b.follow_up_date!))
    .slice(0, 5);

  const colors = ["hsl(220 88% 45%)", "hsl(200 80% 55%)", "hsl(160 60% 45%)", "hsl(45 90% 55%)", "hsl(0 75% 60%)", "hsl(280 60% 55%)"];

  const kpis = [
    { label: "Total Proposals", value: proposals.length, icon: FileText, color: "text-primary" },
    { label: "Today", value: todayCount, icon: Clock, color: "text-info" },
    { label: "Pending", value: pending.length, icon: TrendingUp, color: "text-warning" },
    { label: "Won", value: won.length, icon: Trophy, color: "text-success" },
    { label: "Lost", value: lost.length, icon: XCircle, color: "text-destructive" },
    { label: "Proposal Value", value: formatCompact(totalValue), icon: DollarSign, color: "text-primary" },
    { label: "Won Value", value: formatCompact(wonValue), icon: DollarSign, color: "text-success" },
    { label: "Conversion", value: `${conversion}%`, icon: Percent, color: "text-accent" },
    { label: "Customers", value: customers.length, icon: Users, color: "text-info" },
    { label: "Follow-ups", value: upcoming.length, icon: CalendarClock, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time view of your sales pipeline.</p>
        </div>
        <Button asChild className="gradient-primary">
          <Link to="/proposals/new"><PlusCircle className="h-4 w-4 mr-1" /> Create Proposal</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4 shadow-elegant">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <Icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{k.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 shadow-elegant">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Monthly Proposal Trend</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(220 88% 45%)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h2 className="font-semibold mb-2">Sales Funnel</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(220 88% 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h2 className="font-semibold mb-2">Product-wise Quotations</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={productData.length ? productData : [{ name: "No data", value: 1 }]} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {(productData.length ? productData : [{ name: "" }]).map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h2 className="font-semibold mb-2">Country-wise Customers</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(200 80% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h2 className="font-semibold mb-2">Revenue Forecast</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCompact(v)} />
                <Line type="monotone" dataKey="value" stroke="hsl(160 60% 45%)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Customers</h2>
            <Link to="/customers" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {customers.slice(0, 6).map(c => (
              <div key={c.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{c.company_name || c.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(", ")}</div>
                </div>
                <div className="text-xs text-muted-foreground">{c.industry}</div>
              </div>
            ))}
            {customers.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No customers yet.</div>}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming Follow-ups</h2>
            <Link to="/proposals" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {upcoming.map(p => (
              <Link key={p.id} to="/proposals/$id" params={{ id: p.id }} className="py-2 flex items-center justify-between text-sm hover:bg-secondary/40 -mx-2 px-2 rounded">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.proposal_number}</div>
                </div>
                <div className="text-xs font-medium text-warning">{p.follow_up_date}</div>
              </Link>
            ))}
            {upcoming.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No follow-ups scheduled.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
