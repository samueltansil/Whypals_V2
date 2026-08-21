import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Clock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Video, Banner } from "@shared/schema";
import watchPlaceholder from "@/assets/watch-placeholder.png";

export function FeaturedVideoSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: featuredVideos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos/featured"],
  });

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners/active"],
  });

  const allFeaturedItems = [
    ...featuredVideos.map(v => ({ type: 'video' as const, data: v })),
    ...banners.map(b => ({ type: 'banner' as const, data: b }))
  ];

  const nextSlide = useCallback(() => {
    if (allFeaturedItems.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % allFeaturedItems.length);
    }
  }, [allFeaturedItems.length]);

  const prevSlide = useCallback(() => {
    if (allFeaturedItems.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + allFeaturedItems.length) % allFeaturedItems.length);
    }
  }, [allFeaturedItems.length]);

  useEffect(() => {
    if (allFeaturedItems.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [allFeaturedItems.length, nextSlide]);

  useEffect(() => {
    if (currentSlide >= allFeaturedItems.length && allFeaturedItems.length > 0) {
      setCurrentSlide(0);
    }
  }, [allFeaturedItems.length, currentSlide]);

  if (allFeaturedItems.length === 0) {
    return null;
  }

  const currentItem = allFeaturedItems[currentSlide];

  return (
    <div className="relative mb-8 rounded-2xl overflow-hidden bg-white shadow-lg aspect-[40/21] md:aspect-auto md:h-[340px] lg:h-[400px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="relative h-full"
        >
          {currentItem.type === 'video' ? (
            <Link href={`/video/${currentItem.data.id}`}>
              <div className="flex flex-col md:grid md:grid-cols-2 gap-0 h-full md:h-full cursor-pointer group">
                <div className="order-2 md:order-1 flex-1 p-5 md:p-8 flex flex-col justify-start md:justify-center md:h-full bg-gradient-to-br from-white to-blue-50">
                  <h2 className="font-heading text-xl md:text-2xl lg:text-3xl font-bold mb-3 line-clamp-2 text-foreground">
                    {currentItem.data.title}
                  </h2>
                  {currentItem.data.description && (
                    <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-2">
                      {currentItem.data.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {currentItem.data.duration}
                    </span>
                    <span>{currentItem.data.views?.toLocaleString() || 0} views</span>
                  </div>
                  <Button size="sm" className="mt-auto w-fit rounded-full text-sm px-6 h-9 shadow-md shadow-primary/20 gap-2" data-testid="button-watch-featured">
                    <Play className="w-4 h-4 fill-current" />
                    Watch Now
                  </Button>
                </div>
                <div className="order-1 md:order-2 relative h-[60%] md:h-full overflow-hidden">
                  {currentItem.data.thumbnail ? (
                    <img 
                      src={currentItem.data.thumbnail}
                      alt={currentItem.data.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <img 
                      src={watchPlaceholder}
                      alt="Watch"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-primary fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                      Featured Video
                    </span>
                    <span className="bg-white/90 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                      {currentItem.data.category}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div 
              className="w-full h-full relative cursor-pointer group"
              onClick={() => {
                console.log("Banner clicked:", currentItem.data.title);
              }}
            >
               <img
                 src={currentItem.data.imageUrl}
                 alt={currentItem.data.title}
                 className="absolute inset-0 w-full h-full object-cover object-bottom md:object-center"
               />
               <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
               <div className="absolute top-3 left-3 flex items-center gap-2">
                 <span className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full">
                   Weekly Theme
                 </span>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {allFeaturedItems.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            data-testid="button-prev-featured-video"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            data-testid="button-next-featured-video"
          >
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {allFeaturedItems.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.preventDefault(); setCurrentSlide(index); }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-primary w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                data-testid={`button-slide-video-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
