import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Search, Trophy, Menu, X, Home, Play, Gamepad2, GraduationCap, Settings, Puzzle, Sparkles, Target, HelpCircle, Calendar, ChevronLeft, ChevronRight, BarChart2, PenLine, Zap, ImageIcon, Hash, Eye, Smile } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import gamesHero from "@assets/generated_images/kids_games_hero_illustration.png";
import logo from "@assets/whypals-logo.png";
import { Button } from "@/components/ui/button";
import { ActivityTracker } from "@/components/activity-tracker";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { usePoints } from "@/hooks/usePoints";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { StoryGame, Banner } from "@shared/schema";
import ProfileButton from "@/components/ProfileButton";
import playPlaceholder from "@/assets/play-placeholder.png";
import { Helmet } from "@/lib/helmet";

const GAME_TYPE_ICONS: Record<string, typeof Puzzle> = {
  puzzle: Puzzle,
  whack: Target,
  match: Sparkles,
  quiz: HelpCircle,
  timeline: Calendar,
  poll: BarChart2,
  fillblank: PenLine,
  truefalse: Zap,
  scramble: ImageIcon,
  guessnumber: Hash,
  oddoneout: Eye,
  emojidecoder: Smile,
};

const GAME_TYPE_COLORS: Record<string, string> = {
  puzzle: "bg-purple-100 text-purple-600",
  whack: "bg-red-100 text-red-600",
  match: "bg-emerald-100 text-emerald-600",
  quiz: "bg-blue-100 text-blue-600",
  timeline: "bg-orange-100 text-orange-600",
  poll: "bg-indigo-100 text-indigo-600",
  fillblank: "bg-cyan-100 text-cyan-600",
  truefalse: "bg-yellow-100 text-yellow-600",
  scramble: "bg-pink-100 text-pink-600",
  guessnumber: "bg-lime-100 text-lime-600",
  oddoneout: "bg-rose-100 text-rose-600",
  emojidecoder: "bg-amber-100 text-amber-600",
};

export default function Games() {
  const { points, isLoading: pointsLoading } = usePoints();
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: games = [], isLoading } = useQuery<StoryGame[]>({
    queryKey: ["/api/games"],
    queryFn: async () => {
      const res = await fetch("/api/games");
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
  });

  const { data: featuredGames = [] } = useQuery<StoryGame[]>({
    queryKey: ["/api/games/featured"],
    queryFn: async () => {
      const res = await fetch("/api/games/featured");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners/active"],
  });

  const allFeaturedItems = [
    ...featuredGames
      .filter(g => g.gameType !== 'poll')
      .map(g => ({ type: 'game' as const, data: g })),
    ...banners.map(b => ({ type: 'banner' as const, data: b }))
  ];

  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const nextFeatured = () => {
    if (allFeaturedItems.length > 0) {
      setCurrentFeaturedIndex((prev) => (prev + 1) % allFeaturedItems.length);
    }
  };
  const prevFeatured = () => {
    if (allFeaturedItems.length > 0) {
      setCurrentFeaturedIndex((prev) => (prev - 1 + allFeaturedItems.length) % allFeaturedItems.length);
    }
  };

  useEffect(() => {
    if (allFeaturedItems.length <= 1) return;
    const interval = setInterval(nextFeatured, 5000);
    return () => clearInterval(interval);
  }, [allFeaturedItems.length]);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
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

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || (Array.isArray(game.category) && game.category.includes(activeCategory));
    const isNotPoll = game.gameType !== 'poll';
    return matchesSearch && matchesCategory && isNotPoll;
  });

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Helmet>
        <title>Educational Games for Kids - WhyPals</title>
        <meta name="description" content="Play fun educational games for kids! Puzzles, quizzes, and matching games to learn about history, science, and current events." />
      </Helmet>
      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            WhyPals
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-heading font-semibold text-muted-foreground">
             <Link href="/" className="hover:text-primary transition-colors">Home</Link>
             <Link href="/games" className="text-primary transition-colors">Games</Link>
             <Link href="/big-why" className="hover:text-primary transition-colors">Big Why?</Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full" data-testid="points-tracker">
              <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span className="font-heading font-semibold text-slate-700 dark:text-slate-200">
                {pointsLoading ? '...' : points.toLocaleString()} pts
              </span>
            </div>
            <div className="relative hidden md:block">
               <input 
                type="text" 
                placeholder="Search games..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  <input ref={searchInputRef} type="text" placeholder="Search games..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium" data-testid="input-mobile-search" />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <ActivityTracker />

        <div className="relative mb-8 rounded-2xl overflow-hidden bg-white shadow-lg aspect-[40/21] md:aspect-auto md:h-[340px] lg:h-[400px]">
          {allFeaturedItems.length > 0 ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeaturedIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="relative h-full"
                >
                  {(() => {
                    const item = allFeaturedItems[currentFeaturedIndex];
                    if (item.type === 'game') {
                      const game = item.data;
                      const GameIcon = GAME_TYPE_ICONS[game.gameType] || Gamepad2;
                      const colorClass = GAME_TYPE_COLORS[game.gameType] || "bg-gray-100 text-gray-600";
                      return (
                        <Link href={`/game/${game.id}`} className="block h-full">
                          <div className="flex flex-col md:grid md:grid-cols-2 gap-0 h-full md:h-full cursor-pointer group">
                            <div className="order-2 md:order-1 flex-1 p-5 md:p-8 flex flex-col justify-start md:justify-center md:h-full bg-gradient-to-br from-white to-emerald-50">
                              <div className="inline-flex items-center gap-2 mb-3">
                                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">Featured Game</span>
                                <span className="bg-white/90 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{game.gameType.toUpperCase()}</span>
                              </div>
                              <h2 className="font-heading text-xl md:text-2xl lg:text-3xl font-bold mb-3 line-clamp-2 text-foreground">{game.title}</h2>
                              <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-2">{game.description || "Play, Learn, and Win!"}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> {game.pointsReward} pts</span>
                              </div>
                              <Button size="sm" className="mt-auto w-fit rounded-full text-sm px-6 h-9 shadow-md shadow-primary/20 gap-2">
                                <Play className="w-4 h-4 fill-current" />
                                Play Now
                              </Button>
                            </div>
                            <div className="order-1 md:order-2 relative h-[60%] md:h-full overflow-hidden">
                              {game.thumbnail ? (
                                <img 
                                  src={game.thumbnail}
                                  alt={game.title}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                              ) : (
                                <img 
                                  src={playPlaceholder}
                                  alt="Play"
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                                <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                  <Play className="w-6 h-6 text-primary fill-current ml-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    } else {
                      const banner = item.data;
                      return (
                        <div 
                          className="w-full h-full relative cursor-pointer group"
                          onClick={() => setActiveCategory("Weekly Theme")}
                          data-testid="featured-banner"
                        >
                           <img
                             src={banner.imageUrl}
                             alt={banner.title}
                             className="absolute inset-0 w-full h-full object-cover object-bottom md:object-center"
                           />
                           <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                           <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-bold text-xs tracking-wide">
                             Weekly Theme
                           </span>
                        </div>
                      );
                    }
                  })()}
                </motion.div>
              </AnimatePresence>

              {allFeaturedItems.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.preventDefault(); prevFeatured(); }}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-primary" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); nextFeatured(); }}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-primary" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {allFeaturedItems.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => { e.preventDefault(); setCurrentFeaturedIndex(index); }}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentFeaturedIndex 
                            ? 'bg-primary w-6' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <img src={playPlaceholder} alt="Play" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-primary/10" />
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center">
                <h1 className="font-heading text-4xl md:text-6xl font-bold text-primary mb-2 drop-shadow-sm">Games</h1>
                <p className="text-lg md:text-xl font-bold text-primary/80">Play, Learn, and Win!</p>
              </div>
            </>
          )}
        </div>

        {/* Category Scroll */}
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x mb-4" data-testid="category-scroll">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory("All")}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap font-bold shadow-sm transition-all snap-start ${
              activeCategory === "All" 
                ? "bg-primary text-white shadow-primary/25" 
                : "bg-white text-muted-foreground hover:bg-gray-50"
            }`}
          >
            <Menu className="w-5 h-5" />
            All Games
          </motion.button>
          
          {CATEGORIES.map((cat: any) => {
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
                data-testid={`category-btn-${cat.id}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} />
                {cat.label}
              </motion.button>
            );
          })}
        </div>

        <h2 className="font-heading text-2xl font-bold mb-6">{activeCategory === "All" ? "All Games" : `${activeCategory} Games`}</h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-heading">Loading games...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-3xl">
            <Gamepad2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-heading text-2xl font-bold text-muted-foreground mb-2">
              {games.length === 0 ? "No Games Yet!" : "No games match your search"}
            </h2>
            <p className="text-muted-foreground">
              {games.length === 0 ? "Check back soon for fun new games!" : "Try a different search term"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => {
              const GameIcon = GAME_TYPE_ICONS[game.gameType] || Gamepad2;
              const colorClass = GAME_TYPE_COLORS[game.gameType] || "bg-gray-100 text-gray-600";
              return (
                <Link key={game.id} href={`/game/${game.id}`}>
                  <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer group h-full flex flex-col"
                    data-testid={`card-game-${game.id}`}
                  >
                    <div className="relative mb-4 shrink-0">
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.title}
                          className="w-full h-32 object-cover rounded-2xl"
                        />
                      ) : (
                        <img
                          src={playPlaceholder}
                          alt="Play"
                          className="w-full h-32 object-cover rounded-2xl"
                        />
                      )}
                      <div className={`absolute -bottom-3 -right-3 w-14 h-14 rounded-xl ${colorClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <GameIcon className="w-7 h-7" />
                      </div>
                    </div>
                    <h3 className="font-heading text-xl md:text-2xl font-bold mb-2 text-foreground line-clamp-2">{game.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{game.description || "A fun learning game!"}</p>
                    <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                      <span className="text-xs md:text-sm font-bold text-muted-foreground bg-muted px-2 md:px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap shrink min-w-0">
                        <Trophy className="w-3 h-3 shrink-0" /> {game.pointsReward} pts
                      </span>
                      <Button className="rounded-full font-bold px-3 md:px-4 text-xs md:text-sm shrink-0" size="sm" data-testid={`button-play-${game.id}`}>
                        <span className="md:hidden">Play</span>
                        <span className="hidden md:inline">Play Game</span>
                      </Button>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
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
