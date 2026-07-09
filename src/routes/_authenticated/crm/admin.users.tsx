import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentRole } from "@/lib/crm";
import { UserCog, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [role, setRole] = useState<"admin" | "sales" | null>(null);

  useEffect(() => { getCurrentRole().then(setRole); }, []);

  const roles = useQuery({
    queryKey: ["user_roles_all"],
    queryFn: async () => (await (supabase as any).from("user_roles").select("*")).data ?? [],
    enabled: role === "admin",
  });

  const seed = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).rpc("seed_rsf_demo_data", { _uid: u.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Demo data ready — reload other tabs to see it"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (role === null) return <div>Loading…</div>;
  if (role !== "admin") {
    return (
      <Card className="border-destructive/50 bg-destructive/5 max-w-md">
        <CardContent className="p-6 text-center space-y-2">
          <ShieldAlert className="h-8 w-8 mx-auto text-destructive" />
          <div className="font-semibold">Admin only</div>
          <div className="text-sm text-muted-foreground">You need admin role to manage users.</div>
        </CardContent>
      </Card>
    );
  }

  const grouped: Record<string, string[]> = {};
  (roles.data ?? []).forEach((r: any) => { (grouped[r.user_id] ||= []).push(r.role); });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Users & Roles</h1>
        <Button onClick={() => seed.mutate()} variant="outline"><Sparkles className="h-4 w-4 mr-1" />Load Demo Data</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4" />Registered users</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            New signups become <b>Sales Executive</b> by default. The very first signup becomes <b>Admin</b>.
            To promote another user, ask them to sign up, then update their role from the database.
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr><th className="text-left p-2">User ID</th><th className="text-left p-2">Roles</th></tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([uid, rs]) => (
                <tr key={uid} className="border-t">
                  <td className="p-2 font-mono text-xs">{uid.slice(0, 8)}…</td>
                  <td className="p-2 space-x-1">
                    {rs.map(r => <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}
                  </td>
                </tr>
              ))}
              {Object.keys(grouped).length === 0 && <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No users</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
