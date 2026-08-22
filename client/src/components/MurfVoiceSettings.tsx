import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MurfVoiceSettingsData {
  voiceId: string;
  style: string;
  rate: number;
}

// Shown next to "Generate Audio" in /admin/stories. Murf AI releases new
// voice codes and styles all the time, so instead of hardcoding a picker
// with a fixed list, this is just three plain text fields that get sent
// straight through to Murf's API on the next "Generate Audio" click — type
// whatever voice code / style Murf's own docs list (e.g. "Ken" / "Wizard"),
// no code change or redeploy needed.
export function MurfVoiceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [voiceId, setVoiceId] = useState("");
  const [style, setStyle] = useState("");
  const [rate, setRate] = useState("");

  const { data, isLoading } = useQuery<MurfVoiceSettingsData>({
    queryKey: ["/api/admin/settings/murf-voice"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/murf-voice", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch voice settings");
      return res.json();
    },
    enabled: open,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setVoiceId(data.voiceId);
      setStyle(data.style);
      setRate(String(data.rate));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings/murf-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ voiceId: voiceId.trim(), style: style.trim(), rate: parseInt(rate, 10) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update voice settings");
      }
      return res.json();
    },
    onSuccess: (result: MurfVoiceSettingsData) => {
      queryClient.setQueryData(["/api/admin/settings/murf-voice"], result);
      toast({
        title: "Voice settings saved",
        description: `Voice "${result.voiceId}" / style "${result.style}" / rate ${result.rate} will be used on the next Generate Audio.`,
      });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save voice settings", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
        data-testid="button-murf-voice-settings"
      >
        <Settings2 className="w-4 h-4" />
        Voice Settings
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Murf Voice Settings</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-500">
                Type the exact voice code, style, and rate from{" "}
                <a
                  href="https://murf.ai/api/docs/text-to-speech/text-to-speech"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Murf's docs
                </a>
                . This only affects audio generated after you save — it does
                not touch audio already cached for existing stories.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="murf-voice-id">Voice ID</Label>
                <Input
                  id="murf-voice-id"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="e.g. Ken"
                  data-testid="input-murf-voice-id"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="murf-style">Style</Label>
                <Input
                  id="murf-style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="e.g. Wizard"
                  data-testid="input-murf-style"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="murf-rate">Rate (-50 slower to 50 faster)</Label>
                <Input
                  id="murf-rate"
                  type="number"
                  min={-50}
                  max={50}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 25"
                  data-testid="input-murf-rate"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !voiceId.trim() || !style.trim() || rate.trim() === ""}
                >
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
