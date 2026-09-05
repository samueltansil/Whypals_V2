import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, Eye, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Video } from "@shared/schema";
import logo from "@assets/whypals-logo.png";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useState, useRef } from "react";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export default function VideoPlayer() {
  const params = useParams<{ id: string }>();
  const videoId = parseInt(params.id || "0");
  useActivityTracker('watching');
  
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showYouTube, setShowYouTube] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: [`/api/videos/${videoId}`],
    enabled: videoId > 0,
  });

  const getLocalVideoSource = () => {
    // Local video assets removed - videos are served from R2 or YouTube
    return null;
  };

  const getYouTubeId = () => {
    if (video?.videoUrl) {
      return extractYouTubeId(video.videoUrl);
    }
    return null;
  };

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

  const handlePlayYouTube = () => {
    setShowYouTube(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Video not found</h1>
          <Link href="/videos">
            <Button>Go back to videos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const localVideoSource = getLocalVideoSource();
  const youtubeId = getYouTubeId();
  const hasLocalVideo = !!localVideoSource;
  const hasYouTubeVideo = !!youtubeId && !hasLocalVideo;
  const hasPlayableVideo = hasLocalVideo || hasYouTubeVideo;

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
            {hasLocalVideo ? (
              <div 
                className="relative aspect-video bg-black"
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(isVideoPlaying ? false : true)}
                data-testid="video-player"
              >
                <video
                  ref={videoRef}
                  src={localVideoSource}
                  poster={video.thumbnail}
                  className="w-full h-full object-contain"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  loop
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
                
                <div className="absolute bottom-16 right-4 bg-black/70 text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                  {video.duration}
                </div>
              </div>
            ) : hasYouTubeVideo ? (
              <div className="relative aspect-video bg-black" data-testid="video-player">
                {showYouTube ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                  />
                ) : (
                  <>
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer group"
                      onClick={handlePlayYouTube}
                    >
                      <button
                        className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform"
                        data-testid="button-play-youtube"
                      >
                        <Play className="w-12 h-12 text-white fill-current ml-2" />
                      </button>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                      {video.duration}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative aspect-video bg-black flex items-center justify-center cursor-pointer group" data-testid="video-player">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="text-center text-white">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-12 h-12 text-white fill-current ml-2" />
                    </div>
                    <p className="text-lg font-heading">Video coming soon!</p>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                  {video.duration}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Link href="/videos">
            <Button variant="ghost" className="mb-6 -ml-2 gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to videos
            </Button>
          </Link>

          <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-foreground" data-testid="video-title">
            {video.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {video.duration}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {video.views?.toLocaleString()} views
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs">
              {video.category}
            </span>
          </div>

          <div className="bg-muted/30 rounded-2xl p-6 mb-8">
            <h3 className="font-heading text-lg font-bold mb-3">About this video</h3>
            <p className="text-foreground/80 leading-relaxed" data-testid="video-description">
              {video.description}
            </p>
          </div>

          <div className="flex gap-4">
            {hasLocalVideo ? (
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
            ) : hasYouTubeVideo ? (
              <Button 
                className="rounded-full gap-2 bg-red-600 hover:bg-red-700" 
                size="lg" 
                onClick={handlePlayYouTube}
                data-testid="button-play"
              >
                <Play className="w-5 h-5 fill-current" />
                {showYouTube ? "Playing..." : "Play Video"}
              </Button>
            ) : (
              <Button className="rounded-full gap-2" size="lg" disabled data-testid="button-play">
                <Play className="w-5 h-5 fill-current" />
                Coming Soon
              </Button>
            )}
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
