import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Search, LogOut, User, Bell, Shield, CreditCard, Menu, X, Home, Play, Gamepad2, GraduationCap, Settings as SettingsIcon, BookOpen, Users, AlertTriangle, Lock, Eye, EyeOff, ChevronRight, Check, Loader2, HelpCircle, Volume2 } from "lucide-react";
import logo from "@assets/whypals-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ProfileButton from "@/components/ProfileButton";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [marketingOptIn, setMarketingOptIn] = useState((user as any)?.marketingEmailsOptIn ?? false);
  const [contentAlertsOptIn, setContentAlertsOptIn] = useState((user as any)?.contentAlertsOptIn ?? true);
  const [teacherUpdatesOptIn, setTeacherUpdatesOptIn] = useState((user as any)?.teacherUpdatesOptIn ?? true);

  const profileMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string }) => {
      return apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile Updated", description: "Your profile has been updated successfully." });
      setShowProfileDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('POST', '/api/user/change-password', data);
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to change password", variant: "destructive" });
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: async (data: { marketingEmailsOptIn: boolean; contentAlertsOptIn: boolean; teacherUpdatesOptIn: boolean }) => {
      return apiRequest('PATCH', '/api/user/notifications', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Notifications Updated", description: "Your notification preferences have been saved." });
      setShowNotificationsDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update notification preferences", variant: "destructive" });
    },
  });

  const handleProfileSave = () => {
    profileMutation.mutate({ firstName, lastName });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "New passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleNotificationsSave = () => {
    notificationsMutation.mutate({
      marketingEmailsOptIn: marketingOptIn,
      contentAlertsOptIn: contentAlertsOptIn,
      teacherUpdatesOptIn: teacherUpdatesOptIn,
    });
  };

  const navLinks = [
    { href: "/", label: "Listen", icon: Volume2 },
    { href: "/videos", label: "Videos", icon: Play },
    { href: "/games", label: "Games", icon: Gamepad2 },
    { href: "/big-why", label: "Big Why?", icon: HelpCircle },
  ];

  const handleMobileSearchToggle = () => {
    setMobileSearchOpen(!mobileSearchOpen);
    if (!mobileSearchOpen) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            WhyPals
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-heading font-semibold text-muted-foreground">
             <Link href="/" className="hover:text-primary transition-colors">Listen</Link>
             <Link href="/videos" className="hover:text-primary transition-colors">Videos</Link>
             <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
             <Link href="/big-why" className="hover:text-primary transition-colors">Big Why?</Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
               <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium w-48 transition-all focus:w-64"
                data-testid="input-search-settings"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="hidden md:block">
              <ProfileButton />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={handleMobileSearchToggle}
              data-testid="button-mobile-search"
            >
              {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3 font-heading">
                    <img src={logo} alt="WhyPals" className="h-10 w-10" />
                    WhyPals
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-2">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location === link.href;
                    return (
                      <Link 
                        key={link.href}
                        href={link.href} 
                        onClick={() => setMobileMenuOpen(false)} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold ${
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" /> {link.label}
                      </Link>
                    );
                  })}
                  {user && (
                    <>
                      <div className="border-t my-4" />
                      <Link 
                        href="/settings" 
                        onClick={() => setMobileMenuOpen(false)} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold ${
                          location === "/settings" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <SettingsIcon className="w-5 h-5" /> Settings
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden border-t border-border/50">
              <div className="px-4 py-3">
                <div className="relative">
                  <input ref={searchInputRef} type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium" data-testid="input-mobile-search" />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-8">Settings</h1>
          
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-border mb-6">
            <div className="flex items-center gap-6 mb-8">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <div>
                <h2 className="font-heading text-2xl font-bold">{user?.firstName || user?.email || 'User'}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                {(user as any)?.emailVerified && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    <Check className="w-3 h-3" /> Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <motion.div
              whileHover={{ x: 5 }}
              onClick={() => {
                setFirstName(user?.firstName || "");
                setLastName(user?.lastName || "");
                setShowProfileDialog(true);
              }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-bold">Profile</h3>
                <p className="text-sm text-muted-foreground">Edit your profile information</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.div>

            <motion.div
              whileHover={{ x: 5 }}
              onClick={() => setShowNotificationsDialog(true)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-bold">Notifications</h3>
                <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.div>

            <motion.div
              whileHover={{ x: 5 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-bold">Subscription</h3>
                <p className="text-sm text-green-600 font-medium">Currently Free for All Users</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 5 }}
              onClick={() => navigate('/about')}
              className="bg-white rounded-2xl p-6 shadow-sm border border-border flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-bold">Privacy & Safety</h3>
                <p className="text-sm text-muted-foreground">View our privacy policy and safety guidelines</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>

          <div className="mt-8">
            <Button 
              variant="outline" 
              className="w-full rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => window.location.href = '/api/auth/logout'}
              data-testid="button-logout-settings"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <Button 
                onClick={handleProfileSave} 
                disabled={profileMutation.isPending}
                className="w-full"
              >
                {profileMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
              </Button>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-heading font-bold mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Change Password
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                  {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-sm text-destructive">Passwords don't match</p>
                  )}
                </div>
                <Button 
                  onClick={handlePasswordChange}
                  disabled={passwordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
                  variant="outline"
                  className="w-full"
                >
                  {passwordMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Changing...</> : "Change Password"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Notification Preferences</DialogTitle>
            <DialogDescription>Choose which emails you'd like to receive</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Receive news about new features and promotions</p>
              </div>
              <Switch
                checked={marketingOptIn}
                onCheckedChange={setMarketingOptIn}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Content Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when new stories and games are added</p>
              </div>
              <Switch
                checked={contentAlertsOptIn}
                onCheckedChange={setContentAlertsOptIn}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Teacher Marketplace Updates</Label>
                <p className="text-sm text-muted-foreground">Updates about new educational resources</p>
              </div>
              <Switch
                checked={teacherUpdatesOptIn}
                onCheckedChange={setTeacherUpdatesOptIn}
              />
            </div>
            <Button 
              onClick={handleNotificationsSave}
              disabled={notificationsMutation.isPending}
              className="w-full"
            >
              {notificationsMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Preferences"}
            </Button>
          </div>
      </DialogContent>
      </Dialog>

    </div>
  );
}
