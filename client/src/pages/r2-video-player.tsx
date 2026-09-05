import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, Cloud, Play, Pause, Volume2, VolumeX, Maximize, FlaskConical, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@assets/whypals-logo.png";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useState, useRef, useEffect } from "react";
import { useR2VideoUrl, useR2VideoMetadataByKey } from "@/hooks/useR2Videos";

function extractVideoName(key: string): string {
  const filename = key.split("/").pop() || key;
  const nameWithoutExt = filename.replace(/\.(mp4|webm|mov)$/i, "");
  return nameWithoutExt
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CATEGORY_STYLES: Record<string, { color: string; icon: typeof Cloud }> = {
  Science: { color: "bg-blue-100 text-blue-700", icon: FlaskConical },
  Nature: { color: "bg-green-100 text-green-700", icon: Leaf },
  Fun: { color: "bg-yellow-100 text-yellow-700", icon: Sparkles },
};

export default function R2VideoPlayer() {
  const params = useParams<{ key: string }>();
  const videoKey = decodeURIComponent(params.key || "");
  const fallbackName = extractVideoName(videoKey);
  
  useActivityTracker('watching');
  
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: urlData, isLoading, error } = useR2VideoUrl(videoKey);
  const { data: metadata } = useR2VideoMetadataByKey(videoKey);
  
  const getDefaultCategory = (key: string): string => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("ytdown")) return "Nature";
    if (lowerKey.includes("science") || lowerKey.includes("space") || lowerKey.includes("volcano")) return "Science";
    return "Fun";
  };
  
  const videoTitle = metadata?.title || fallbackName;
  const videoDescription = metadata?.description || `This video is stored in your personal cloud storage and is available for streaming. Enjoy watching "${videoTitle}"!`;
  const videoCategory = metadata?.category || getDefaultCategory(videoKey);
  const categoryStyle = CATEGORY_STYLES[videoCategory];
  const CategoryIcon = categoryStyle?.icon || Sparkles;

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        const mins = Math.floor(video.duration / 60);
        const secs = Math.floor(video.duration % 60);
        setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [urlData?.url]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-heading">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !urlData?.url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Video not found</h1>
          <p className="text-muted-foreground mb-6">We couldn't load this video from your storage.</p>
          <Link href="/videos">
            <Button>Go back to videos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            <span className="hidden sm:inline">WhyPals</span>
          </Link>
          
          <div className="flex items-center gap-3 md:gap-8 font-heading font-semibold text-muted-foreground text-sm md:text-base whitespace-nowrap">
            <Link href="/" className="hover:text-primary transition-colors">Listen</Link>
            <Link href="/videos" className="text-primary transition-colors">Videos</Link>
            <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
            <Link href="/big-why" className="hover:text-primary transition-colors">Big Why?</Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <div className="bg-black">
          <div className="container mx-auto max-w-5xl">
            <div 
              className="relative aspect-video bg-black"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(isVideoPlaying ? false : true)}
              data-testid="r2-video-player"
            >
              <video
                ref={videoRef}
                src={urlData.url}
                className="w-full h-full object-contain"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              />
              
              {showControls && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
                  <button
                    onClick={handlePlayPause}
                    className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                    data-testid="button-play-video"
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-10 h-10 text-primary" />
                    ) : (
                      <Play className="w-10 h-10 text-primary fill-current ml-1" />
                    )}
                  </button>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="text-white hover:text-primary transition-colors"
                    data-testid="button-play-pause"
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 fill-current" />
                    )}
                  </button>
                  <button
                    onClick={handleMuteToggle}
                    className="text-white hover:text-primary transition-colors"
                    data-testid="button-mute"
                  >
                    {isMuted ? (
                      <VolumeX className="w-6 h-6" />
                    ) : (
                      <Volume2 className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex-grow" />
                  <button
                    onClick={handleFullscreen}
                    className="text-white hover:text-primary transition-colors"
                    data-testid="button-fullscreen"
                  >
                    <Maximize className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {duration && (
                <div className="absolute bottom-16 right-4 bg-black/70 text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                  {duration}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Link href="/videos">
            <Button variant="ghost" className="mb-6 -ml-2 gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to videos
            </Button>
          </Link>

          <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-foreground" data-testid="text-r2-video-title">
            {videoTitle}
          </h1>

          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
            {duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {duration}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full font-semibold text-xs flex items-center gap-1 ${categoryStyle?.color || "bg-purple-100 text-purple-700"}`}>
              <CategoryIcon className="w-3 h-3" />
              {videoCategory || "Cloud Video"}
            </span>
          </div>

          <div className="bg-muted/30 rounded-2xl p-6 mb-8">
            <h3 className="font-heading text-lg font-bold mb-3">About this video</h3>
            <p className="text-foreground/80 leading-relaxed" data-testid="video-description">
              {videoDescription}
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              className="rounded-full gap-2" 
              size="lg" 
              onClick={handlePlayPause}
              data-testid="button-play"
            >
              {isVideoPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause Video
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Play Video
                </>
              )}
            </Button>
            <Link href="/videos">
              <Button variant="outline" className="rounded-full" size="lg" data-testid="button-more-videos">
                Watch more videos
              </Button>
            </Link>
          </div>
        </div>
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
