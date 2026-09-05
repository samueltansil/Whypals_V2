import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Search, Filter, ShoppingBag, FileText, Video, HelpCircle, Package, ArrowLeft, Home, Play, Gamepad2, GraduationCap, Menu, X, Settings, Volume2 } from "lucide-react";
import logo from "@assets/whypals-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { COURSEWORK_TYPES, SUBJECTS, type CourseworkItem } from "@shared/schema";

export default function Marketplace() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery<CourseworkItem[]>({
    queryKey: ["/api/marketplace"],
  });

  const navLinks = [
    { href: "/", label: "Listen", icon: Volume2 },
    { href: "/videos", label: "Videos", icon: Play },
    { href: "/games", label: "Games", icon: Gamepad2 },
    { href: "/big-why", label: "Big Why?", icon: HelpCircle },
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || item.itemType === typeFilter;
    const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter;
    
    let matchesPrice = true;
    if (priceFilter === "free") matchesPrice = (item.price || 0) === 0;
    else if (priceFilter === "under5") matchesPrice = (item.price || 0) > 0 && (item.price || 0) <= 500;
    else if (priceFilter === "under10") matchesPrice = (item.price || 0) > 500 && (item.price || 0) <= 1000;
    else if (priceFilter === "over10") matchesPrice = (item.price || 0) > 1000;
    
    return matchesSearch && matchesType && matchesSubject && matchesPrice;
  });

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
            <h1 className="font-heading text-3xl font-bold">Marketplace</h1>
            <p className="text-muted-foreground">Discover quality educational content from teachers worldwide</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search coursework..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {COURSEWORK_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="under5">Under $5</SelectItem>
                <SelectItem value="under10">$5 - $10</SelectItem>
                <SelectItem value="over10">Over $10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading marketplace...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-heading text-2xl font-bold mb-2">No Items Found</h2>
            <p className="text-muted-foreground">
              {items.length === 0 ? "Be the first to list educational content!" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const TypeIcon = getTypeIcon(item.itemType);
              return (
                <Link key={item.id} href={`/marketplace/${item.id}`}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer h-full flex flex-col"
                  >
                    <div className="h-40 bg-gradient-to-br from-primary/10 to-purple-100 flex items-center justify-center">
                      <TypeIcon className="w-16 h-16 text-primary/40" />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {COURSEWORK_TYPES.find(t => t.id === item.itemType)?.label || item.itemType}
                        </span>
                        {item.subject && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {item.subject}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-lg font-bold mb-2 line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-xl text-primary">
                          {(item.price || 0) === 0 ? "Free" : `$${((item.price || 0) / 100).toFixed(2)}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.salesCount} sales</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
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
