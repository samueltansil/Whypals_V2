import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Trophy, Star, TrendingUp, Users, Crown, Medal, Award, FileText, Video, HelpCircle, Package, Home, Play, Gamepad2, GraduationCap, Menu, Settings, Volume2 } from "lucide-react";
import logo from "@assets/whypals-logo.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { COURSEWORK_TYPES, type CourseworkItem, type User } from "@shared/schema";

export default function Leaderboard() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'teachers' | 'products'>('teachers');

  const { data: topTeachers = [] } = useQuery<User[]>({
    queryKey: ["/api/marketplace/leaderboard/teachers"],
  });

  const { data: topProducts = [] } = useQuery<CourseworkItem[]>({
    queryKey: ["/api/marketplace/leaderboard/products"],
  });

  const navLinks = [
    { href: "/", label: "Listen", icon: Volume2 },
    { href: "/videos", label: "Videos", icon: Play },
    { href: "/games", label: "Games", icon: Gamepad2 },
    { href: "/big-why", label: "Big Why?", icon: HelpCircle },
  ];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{index + 1}</span>;
  };

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
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/teachers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground">Top teachers and best-selling resources</p>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === 'teachers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('teachers')}
            className="rounded-full font-bold gap-2"
          >
            <Users className="w-4 h-4" /> Top Teachers
          </Button>
          <Button
            variant={activeTab === 'products' ? 'default' : 'outline'}
            onClick={() => setActiveTab('products')}
            className="rounded-full font-bold gap-2"
          >
            <TrendingUp className="w-4 h-4" /> Top Products
          </Button>
        </div>

        {activeTab === 'teachers' ? (
          <div className="space-y-4">
            {topTeachers.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-3xl">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-xl font-bold mb-2">No Teachers Yet</h3>
                <p className="text-muted-foreground">Be the first to join as a teacher!</p>
              </div>
            ) : (
              topTeachers.map((teacher, index) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/teacher/${teacher.id}`}>
                    <div className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-4 ${index < 3 ? 'border-2 border-yellow-200' : ''}`}>
                      <div className="w-10 flex justify-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {teacher.profileImageUrl ? (
                          <img src={teacher.profileImageUrl} alt={teacher.firstName || ''} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-7 h-7 text-primary/50" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-lg font-bold">{teacher.firstName} {teacher.lastName}</h3>
                        <p className="text-sm text-muted-foreground">{teacher.subjectsTaught || 'Various Subjects'}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-500 justify-end mb-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">{teacher.reputationScore || 0}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{teacher.totalSales || 0} sales</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-3xl">
                <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-xl font-bold mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">Be the first to list educational content!</p>
              </div>
            ) : (
              topProducts.map((item, index) => {
                const TypeIcon = getTypeIcon(item.itemType);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/marketplace/${item.id}`}>
                      <div className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-4 ${index < 3 ? 'border-2 border-yellow-200' : ''}`}>
                        <div className="w-10 flex justify-center">
                          {getRankIcon(index)}
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <TypeIcon className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-heading text-lg font-bold line-clamp-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {COURSEWORK_TYPES.find(t => t.id === item.itemType)?.label || item.itemType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {(item.price || 0) === 0 ? "Free" : `$${((item.price || 0) / 100).toFixed(2)}`}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.salesCount} sales</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Edu Foundations. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
