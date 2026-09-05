import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Play, Clock, Search, Menu, FlaskConical, Leaf, Sparkles, Cloud, Pencil, X, Home, Gamepad2, GraduationCap, Settings, Star, HelpCircle, Volume2 } from "lucide-react";
import { FeaturedVideoSlideshow } from "@/components/featured-video-slideshow";
import logo from "@assets/whypals-logo.png";
import watchPlaceholder from "@/assets/watch-placeholder.png";
import { useQuery } from "@tanstack/react-query";
import type { Video } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ActivityTracker } from "@/components/activity-tracker";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useR2Videos, useR2VideoUrl, useR2VideoMetadata, useSaveR2VideoMetadata, type R2Video, type R2VideoMetadata } from "@/hooks/useR2Videos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import ProfileButton from "@/components/ProfileButton";

const VIDEO_CATEGORIES = [
  { id: "Science", label: "Science", icon: FlaskConical, color: "bg-blue-100 text-blue-700" },
  { id: "Nature", label: "Nature", icon: Leaf, color: "bg-green-100 text-green-700" },
  { id: "Fun", label: "Fun", icon: Sparkles, color: "bg-yellow-100 text-yellow-700" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getR2VideoCategory(key: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("ytdown")) return "Nature";
  if (lowerKey.includes("science") || lowerKey.includes("space") || lowerKey.includes("volcano")) return "Science";
  if (lowerKey.includes("fun") || lowerKey.includes("funny") || lowerKey.includes("cat")) return "Fun";
  return "Fun";
}

const durationCache = new Map<string, string>();

function fetchVideoDuration(url: string, videoKey: string): Promise<string> {
  const cached = durationCache.get(videoKey);
  if (cached) return Promise.resolve(cached);
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      const mins = Math.floor(video.duration / 60);
      const secs = Math.floor(video.duration % 60);
      const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      video.src = '';
      durationCache.set(videoKey, durationStr);
      resolve(durationStr);
    };
    video.onerror = () => {
      video.src = '';
      reject(new Error('Failed to load video metadata'));
    };
  });
}

function useR2VideoDuration(videoKey: string): string | null {
  const { data: urlData } = useR2VideoUrl(videoKey);
  const cachedDuration = durationCache.get(videoKey);
  
  const { data: duration } = useQuery({
    queryKey: ['r2-video-duration', videoKey],
    queryFn: () => fetchVideoDuration(urlData!.url, videoKey),
    enabled: !!urlData?.url && !cachedDuration,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    placeholderData: (prev) => prev,
  });

  return cachedDuration ?? duration ?? null;
}

function EditVideoDialog({ 
  isOpen, 
  onClose, 
  r2Video, 
  metadata 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  r2Video: R2Video; 
  metadata: R2VideoMetadata | null;
}) {
  const saveMutation = useSaveR2VideoMetadata();
  const [title, setTitle] = useState(metadata?.title || r2Video.name);
  const [description, setDescription] = useState(metadata?.description || "");
  const [category, setCategory] = useState(metadata?.category || getR2VideoCategory(r2Video.key));

  useEffect(() => {
    if (isOpen) {
      setTitle(metadata?.title || r2Video.name);
      setDescription(metadata?.description || "");
      setCategory(metadata?.category || getR2VideoCategory(r2Video.key));
    }
  }, [isOpen, metadata, r2Video]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      r2Key: r2Video.key,
      title,
      description: description || null,
      category,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Video Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              data-testid="input-video-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={3}
              data-testid="input-video-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-video-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending || !title}
              data-testid="button-save-video"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function R2VideoCard({ r2Video, metadata, isAdmin }: { r2Video: R2Video; metadata?: R2VideoMetadata | null; isAdmin?: boolean }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const duration = useR2VideoDuration(r2Video.key);
  const videoCategory = metadata?.category || getR2VideoCategory(r2Video.key);
  const videoTitle = metadata?.title || r2Video.name;
  const category = VIDEO_CATEGORIES.find(c => c.id === videoCategory);
  const bgGradient = videoCategory === "Nature" 
    ? "from-green-100 to-green-200" 
    : videoCategory === "Science" 
    ? "from-blue-100 to-blue-200"
    : videoCategory === "Fun"
    ? "from-yellow-100 to-yellow-200"
    : "from-purple-100 to-purple-200";
  const iconColor = videoCategory === "Nature" 
    ? "text-green-300" 
    : videoCategory === "Science" 
    ? "text-blue-300"
    : videoCategory === "Fun"
    ? "text-yellow-300"
    : "text-purple-300";

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditOpen(true);
  };

  return (
    <>
      <Link href={`/r2-video/${encodeURIComponent(r2Video.key)}`} data-testid={`link-r2-video-${r2Video.key}`}>
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
          data-testid={`card-r2-video-${r2Video.key}`}
        >
          <div className={`relative aspect-video bg-gradient-to-br ${bgGradient}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Cloud className={`w-16 h-16 ${iconColor}`} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/5 transition-colors">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-primary fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md">
              {duration || <span className="animate-pulse">...</span>}
            </div>
            {category && (
              <div className={`absolute top-2 left-2 text-xs font-bold px-3 py-1 rounded-full ${category.color}`}>
                {category.label}
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={handleEditClick}
                className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-10"
                data-testid={`button-edit-video-${r2Video.key}`}
              >
                <Pencil className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-heading text-lg md:text-xl font-bold mb-2 text-foreground line-clamp-1">{videoTitle}</h3>
            <div className="flex items-center text-sm text-muted-foreground gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> 
                {duration || <span className="animate-pulse">...</span>}
              </span>
              <span className="flex items-center gap-1"><Cloud className="w-3 h-3" /> R2 Storage</span>
            </div>
          </div>
        </motion.div>
      </Link>
      <EditVideoDialog 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        r2Video={r2Video} 
        metadata={metadata || null}
      />
    </>
  );
}

export default function Videos() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

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
  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });
  const { data: r2Videos = [], isLoading: isLoadingR2 } = useR2Videos();
  const { data: r2Metadata = [] } = useR2VideoMetadata();
  const isAdmin = user?.isAdmin || false;

  const getMetadataForKey = (key: string) => r2Metadata.find(m => m.r2Key === key);
  const getVideoCategory = (r2Video: R2Video) => {
    const metadata = getMetadataForKey(r2Video.key);
    return metadata?.category || getR2VideoCategory(r2Video.key);
  };

  const filteredVideos = activeCategory === "All" 
    ? videos 
    : videos.filter(v => v.category === activeCategory);

  const filteredR2Videos = activeCategory === "All"
    ? r2Videos
    : r2Videos.filter(v => getVideoCategory(v) === activeCategory);

  const featuredVideo = videos.length > 0 ? videos.reduce((max, v) => v.views > max.views ? v : max, videos[0]) : null;
  const isLoadingAny = isLoading || isLoadingR2;
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            WhyPals
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-heading font-semibold text-muted-foreground">
             <Link href="/" className="hover:text-primary transition-colors">Listen</Link>
             <Link href="/videos" className="text-primary transition-colors">Videos</Link>
             <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
             <Link href="/big-why" className="hover:text-primary transition-colors">Big Why?</Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
               <input 
                type="text" 
                placeholder="Search videos..." 
                className="pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium w-48 transition-all focus:w-64"
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
                  <>
                    <div className="border-t my-4" />
                    <Link 
                      href={user ? "/settings" : "/login"} 
                      onClick={() => setMobileMenuOpen(false)} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold ${
                        user && location === "/settings" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <Settings className="w-5 h-5" /> Settings
                    </Link>
                  </>
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
                  <input ref={searchInputRef} type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium" data-testid="input-mobile-search" />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <ActivityTracker />

        <FeaturedVideoSlideshow />

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x" data-testid="video-category-scroll">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory("All")}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap font-bold shadow-sm transition-all snap-start ${
              activeCategory === "All" 
                ? "bg-primary text-white shadow-primary/25" 
                : "bg-white text-muted-foreground hover:bg-gray-50"
            }`}
            data-testid="video-category-all"
          >
            <Menu className="w-5 h-5" />
            All Videos
          </motion.button>
          
          {VIDEO_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap font-bold shadow-sm transition-all snap-start ${
                  isActive 
                    ? "bg-primary text-white shadow-primary/25" 
                    : "bg-white text-muted-foreground hover:bg-gray-50"
                }`}
                data-testid={`video-category-${cat.id}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} />
                {cat.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      <main className="container mx-auto px-4 pb-8 flex-grow">
        {isLoadingAny ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-heading">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 && filteredR2Videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-heading text-lg">No videos available in this category. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {filteredVideos.map((video) => {
              const category = VIDEO_CATEGORIES.find(c => c.id === video.category);
              return (
                <Link href={`/video/${video.id}`} key={video.id}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    data-testid={`video-card-${video.id}`}
                  >
                    <div className="relative aspect-video">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <img src={watchPlaceholder} alt="Watch" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 text-primary fill-current ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md">
                        {video.duration}
                      </div>
                      {category && (
                        <div className={`absolute top-2 left-2 text-xs font-bold px-3 py-1 rounded-full ${category.color}`}>
                          {category.label}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-lg md:text-xl font-bold mb-2 text-foreground line-clamp-1">{video.title}</h3>
                      <div className="flex items-center text-xs md:text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {video.duration}</span>
                        <span>{video.views} views</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}

            {filteredR2Videos.map((r2Video) => (
              <R2VideoCard key={r2Video.key} r2Video={r2Video} metadata={getMetadataForKey(r2Video.key)} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
              <span className="font-heading text-xl font-bold text-muted-foreground">WhyPals</span>
            </div>
            <div className="flex gap-8 text-sm font-semibold text-muted-foreground">
              <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
            <p className="text-xs text-muted-foreground/50">
              © 2026 Edu Foundations. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
