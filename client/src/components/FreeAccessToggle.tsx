import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Unlock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Shown on /admin/banners — site-wide switch. When ON: /login and /register
// show a friendly "not needed right now" message instead of the real forms,
// the profile icon no longer sends logged-out visitors to login, and games
// no longer require being logged in to play.
export function FreeAccessToggle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/free-access"],
    queryFn: async () => {
      const res = await fetch("/api/settings/free-access", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch free-access setting");
      return res.json();
    },
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/admin/settings/free-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update free-access setting");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/settings/free-access"], result);
      toast({
        title: result.enabled ? "Free access is ON" : "Free access is OFF",
        description: result.enabled
          ? "Login/signup are hidden and games no longer require an account."
          : "Login/signup are back, and games require an account again.",
      });
    },
    onError: () => {
      toast({ title: "Couldn't update setting", variant: "destructive" });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading free-access setting...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted" data-testid="free-access-toggle">
      {data.enabled ? (
        <Unlock className="w-4 h-4 text-primary" />
      ) : (
        <Lock className="w-4 h-4 text-muted-foreground" />
      )}
      <div className="flex flex-col">
        <Label htmlFor="free-access-switch" className="text-sm font-bold cursor-pointer">
          Free access
        </Label>
        <span className="text-xs text-muted-foreground">
          {data.enabled ? "Login is hidden, games are open to everyone" : "Login required to play games"}
        </span>
      </div>
      <Switch
        id="free-access-switch"
        checked={data.enabled}
        disabled={mutation.isPending}
        onCheckedChange={(checked) => mutation.mutate(checked)}
      />
    </div>
  );
}
