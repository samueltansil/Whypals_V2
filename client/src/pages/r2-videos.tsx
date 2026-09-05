import { motion } from "framer-motion";
import { Link } from "wouter";
import { Play, Clock, Search, Menu, Video, FileVideo } from "lucide-react";
import logo from "@assets/whypals-logo.png";
import { useR2Videos, useR2VideoUrl } from "@/hooks/useR2Videos";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function VideoCard({ video }: { video: { key: string; name: string; size: number; lastModified: string | null } }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const { data: urlData, isLoading: isLoadingUrl } = useR2VideoUrl(showPlayer ? video.key : null);

  return (
    <>
      <motion.div
        whileHover={{ y: -5 }}
        className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
        data-testid={`r2-video-card-${video.key}`}
        onClick={() => setShowPlayer(true)}
      >
        <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <FileVideo className="w-16 h-16 text-primary/50" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/5 transition-colors">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-primary fill-current ml-1" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md">
            {formatFileSize(video.size)}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-heading text-lg font-bold mb-2 text-foreground line-clamp-2">{video.name}</h3>
          <div className="flex items-center text-sm text-muted-foreground gap-4">
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              Video
            </span>
          </div>
        </div>
      </motion.div>

      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <div className="aspect-video">
            {isLoadingUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
              </div>
            ) : urlData?.url ? (
              <video
                src={urlData.url}
                controls
                autoPlay
                className="w-full h-full"
                data-testid="r2-video-player"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                Failed to load video
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function R2Videos() {
  const { data: videos = [], isLoading, error } = useR2Videos();

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
            <Link href="/videos" className="hover:text-primary transition-colors">Videos</Link>
            <Link href="/r2-videos" className="text-primary transition-colors">My Videos</Link>
            <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
            <Link href="/big-why" className="hover:text-primary transition-colors">Big Why?</Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">
            Your Video Library
          </h1>
          <p className="text-muted-foreground">
            Videos stored in your Cloudflare R2 bucket
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-heading">Loading your videos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md mx-auto">
              <p className="font-heading font-bold mb-2">Failed to load videos</p>
              <p className="text-sm">Please check your R2 configuration and try again.</p>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <FileVideo className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-heading text-lg mb-2">No videos found in your bucket</p>
            <p className="text-sm text-muted-foreground/70">Upload some MP4, WebM, or MOV files to your R2 bucket to see them here.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{videos.length} video{videos.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video) => (
                <VideoCard key={video.key} video={video} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
              <span className="font-heading text-xl font-bold text-muted-foreground">WhyPals</span>
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
