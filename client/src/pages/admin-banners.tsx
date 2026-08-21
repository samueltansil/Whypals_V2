import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Save, X, Lock, GripVertical, Power, PowerOff } from "lucide-react";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { FreeAccessToggle } from "@/components/FreeAccessToggle";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { Banner } from "@shared/schema";

async function validateSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", { credentials: "include" });
    if (res.ok) {
      return true;
    }
  } catch {}
  return false;
}

function AdminLoginDialog({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      if (res.ok) {
        toast({ title: "Admin access granted!" });
        onSuccess();
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-2">Enter the admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Access Admin Panel"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/">
            <Button variant="link" size="sm">Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function BannerForm({ 
  banner, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  banner?: Banner; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(banner?.title || "");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl || "");
  const [active, setActive] = useState(banner?.active ?? true);
  const [order, setOrder] = useState(banner?.order || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      imageUrl,
      active,
      order: Number(order),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input 
          id="title"
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter banner title"
          required
        />
      </div>

      <ImageUploadField 
        label="Banner Image"
        value={imageUrl}
        onChange={setImageUrl}
        placeholder="https://..."
        uploadEndpoint="/api/admin/upload/banner"
        previewClassName="w-full h-32"
      />

      <div className="space-y-2">
        <Label htmlFor="order">Order (lower numbers appear first)</Label>
        <Input 
          id="order"
          type="number"
          value={order} 
          onChange={(e) => setOrder(Number(e.target.value))}
          placeholder="0"
          required
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="active" className="font-medium">Active Status</Label>
          <p className="text-xs text-muted-foreground">Show this banner on the home page</p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={setActive}
        />
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" /> {isLoading ? "Saving..." : "Save Banner"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminBanners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const { data: isSessionValid, isLoading: isCheckingSession } = useQuery({
    queryKey: ["adminSession"],
    queryFn: validateSession,
    retry: false,
    staleTime: 0
  });

  const isAuthenticated = !!isSessionValid;

  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ['/api/banners'],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create banner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      setIsCreating(false);
      toast({ title: "Success", description: "Banner created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create banner", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update banner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      setEditingBanner(null);
      toast({ title: "Success", description: "Banner updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update banner", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/banners/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete banner");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      toast({ title: "Success", description: "Banner deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete banner", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await fetch(`/api/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update banner status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      toast({ title: "Success", description: "Banner status updated" });
    },
  });

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginDialog onSuccess={() => {
      queryClient.invalidateQueries({ queryKey: ["adminSession"] });
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
    }} />;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Banner Management</h1>
            <p className="text-muted-foreground mt-2">Manage homepage promotional banners</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <FreeAccessToggle />
             <Link href="/admin/games">
              <Button variant="outline">Games</Button>
            </Link>
             <Link href="/admin/stories">
              <Button variant="outline">Stories</Button>
            </Link>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Banner
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6">
            {banners?.sort((a, b) => a.order - b.order).map((banner) => (
              <Card key={banner.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-6 p-6">
                    <div className="flex-shrink-0 relative group">
                      <img 
                        src={banner.imageUrl} 
                        alt={banner.title}
                        className="w-48 h-24 object-cover rounded-lg border"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate">{banner.title}</h3>
                        {banner.active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Power className="w-3 h-3 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            <PowerOff className="w-3 h-3 mr-1" /> Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Order: {banner.order}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: banner.id, active: !banner.active })}
                      >
                        {banner.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingBanner(banner)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this banner?")) {
                            deleteMutation.mutate(banner.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {banners?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                <p>No banners found. Create one to get started.</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Banner</DialogTitle>
            </DialogHeader>
            <BannerForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setIsCreating(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingBanner} onOpenChange={(open) => !open && setEditingBanner(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Banner</DialogTitle>
            </DialogHeader>
            {editingBanner && (
              <BannerForm
                banner={editingBanner}
                onSave={(data) => updateMutation.mutate({ id: editingBanner.id, data })}
                onCancel={() => setEditingBanner(null)}
                isLoading={updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
