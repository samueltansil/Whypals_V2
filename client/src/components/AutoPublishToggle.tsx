import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Shown on both /admin/games and /admin/stories — one shared setting that
// controls whether new AI-generated games and the weekly theme story go
// live automatically, or wait as a draft/inactive item for manual review.
export function AutoPublishToggle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/admin/settings/auto-publish"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/auto-publish", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch auto-publish setting");
      return res.json();
    },
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/admin/settings/auto-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update auto-publish setting");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/admin/settings/auto-publish"], result);
      toast({
        title: result.enabled ? "Auto-publish is ON" : "Auto-publish is OFF",
        description: result.enabled
          ? "New games and the weekly theme story will go live & featured automatically."
          : "New games and the weekly theme story will wait as drafts for you to review.",
      });
    },
    onError: () => {
      toast({ title: "Couldn't update setting", variant: "destructive" });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading auto-publish setting...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted" data-testid="auto-publish-toggle">
      {data.enabled ? (
        <Zap className="w-4 h-4 text-primary" />
      ) : (
        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
      )}
      <div className="flex flex-col">
        <Label htmlFor="auto-publish-switch" className="text-sm font-bold cursor-pointer">
          Auto-publish
        </Label>
        <span className="text-xs text-muted-foreground">
          {data.enabled ? "New games & weekly stories go live automatically" : "Everything waits for your review"}
        </span>
      </div>
      <Switch
        id="auto-publish-switch"
        checked={data.enabled}
        disabled={mutation.isPending}
        onCheckedChange={(checked) => mutation.mutate(checked)}
      />
    </div>
  );
}
