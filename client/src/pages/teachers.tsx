import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Users, Trophy, DollarSign, BookOpen, Search, Menu, X, Home, Play, Gamepad2, Settings, TrendingUp, Star, ArrowRight, FileText, Video, HelpCircle, Package, Volume2 } from "lucide-react";
import logo from "@assets/whypals-logo.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, CourseworkItem } from "@shared/schema";
import ProfileButton from "@/components/ProfileButton";

export default function Teachers() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: topProducts = [] } = useQuery<CourseworkItem[]>({
    queryKey: ["/api/marketplace/leaderboard/products"],
  });

  const { data: topTeachers = [] } = useQuery<User[]>({
    queryKey: ["/api/marketplace/leaderboard/teachers"],
  });

  const { data: allProducts = [] } = useQuery<CourseworkItem[]>({
    queryKey: ["/api/marketplace"],
  });

  const navLinks = [
    { href: "/", label: "Listen", icon: Volume2 },
    { href: "/videos", label: "Videos", icon: Play },
    { href: "/games", label: "Games", icon: Gamepad2 },
    { href: "/big-why", label: "Big Why?", icon: HelpCircle },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf_worksheet':
      case 'unit_plan':
      case 'lesson_bundle':
      case 'homework_pack':
      case 'reading_comprehension':
      case 'project_assignment':
        return FileText;
      case 'video':
        return Video;
      case 'quiz':
        return HelpCircle;
      default:
        return Package;
    }
  };

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
            <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
            <Link href="/big-why" className="hover:text-primary transition-colors">Big Why?</Link>
            <Link href="/teachers" className="text-primary transition-colors">Marketplace</Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <ProfileButton />
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
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
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold hover:bg-muted text-muted-foreground"
                      >
                        <Settings className="w-5 h-5" /> Settings
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <section className="bg-gradient-to-br from-primary/10 via-purple-100/50 to-pink-100/50 py-6 md:py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Resource Marketplace
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
                  Discover quality educational materials created by teachers for teachers
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div 
                className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-3xl p-6 text-center"
                whileHover={{ y: -5 }}
              >
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-lg md:text-xl font-bold mb-2">Earn 80-90%</h3>
                <p className="text-sm text-muted-foreground">Keep the majority of every sale. Low platform fees mean more money in your pocket.</p>
              </motion.div>
              
              <motion.div 
                className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-3xl p-6 text-center"
                whileHover={{ y: -5 }}
              >
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-lg md:text-xl font-bold mb-2">Reach Millions</h3>
                <p className="text-sm text-muted-foreground">Connect with teachers and students worldwide looking for quality educational content.</p>
              </motion.div>
              
              <motion.div 
                className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-3xl p-6 text-center"
                whileHover={{ y: -5 }}
              >
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-lg md:text-xl font-bold mb-2">Build Reputation</h3>
                <p className="text-sm text-muted-foreground">Earn badges, climb leaderboards, and become a top-rated teacher creator.</p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-heading text-3xl font-bold">Top Selling Resources</h2>
              <Link href="/leaderboard">
                <Button variant="ghost" className="gap-2">
                  View Leaderboard <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            {topProducts.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {topProducts.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/marketplace/${item.id}`}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="h-32 bg-gradient-to-br from-primary/10 to-purple-100 rounded-xl mb-4 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-primary/50" />
                      </div>
                      <h3 className="font-heading text-lg font-bold mb-2 line-clamp-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">${((item.price || 0) / 100).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {item.salesCount} sales
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-xl font-bold text-muted-foreground mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">Be the first to upload educational content!</p>
              </div>
            )}
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="font-heading text-2xl font-bold mb-6">All Resources</h2>
            
            {allProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {allProducts.map((item) => {
                  const TypeIcon = getTypeIcon(item.itemType);
                  return (
                    <Link key={item.id} href={`/marketplace/${item.id}`}>
                      <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-muted/30 rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer h-full"
                      >
                        <div className="h-28 bg-gradient-to-br from-primary/10 to-purple-100 rounded-xl mb-3 flex items-center justify-center">
                          <TypeIcon className="w-10 h-10 text-primary/50" />
                        </div>
                        <h3 className="font-heading text-base font-bold mb-1 line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary text-sm">
                            {(item.price || 0) === 0 ? 'Free' : `$${((item.price || 0) / 100).toFixed(2)}`}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.subject}</span>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-2xl">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-heading text-lg font-bold text-muted-foreground mb-1">No Resources Available</h3>
                <p className="text-sm text-muted-foreground">Check back soon for new educational materials!</p>
              </div>
            )}
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-heading text-3xl font-bold">Top Teachers</h2>
              <Link href="/leaderboard">
                <Button variant="ghost" className="gap-2">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            {topTeachers.length > 0 ? (
              <div className="grid md:grid-cols-4 gap-6">
                {topTeachers.slice(0, 4).map((teacher) => (
                  <Link key={teacher.id} href={`/teacher/${teacher.id}`}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      className="bg-muted/30 rounded-2xl p-6 text-center hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                        {teacher.profileImageUrl ? (
                          <img src={teacher.profileImageUrl} alt={teacher.firstName || ''} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-10 h-10 text-primary/50" />
                        )}
                      </div>
                      <h3 className="font-heading text-lg font-bold mb-1">
                        {teacher.firstName} {teacher.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{teacher.subjectsTaught || 'Various Subjects'}</p>
                      <div className="flex items-center justify-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold">{teacher.reputationScore || 0}</span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-3xl">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-xl font-bold text-muted-foreground mb-2">No Teachers Yet</h3>
                <p className="text-muted-foreground">Be the first to join as a teacher!</p>
              </div>
            )}
          </div>
        </section>
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
