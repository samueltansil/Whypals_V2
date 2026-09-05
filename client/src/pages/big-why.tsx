import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { HelpCircle, Loader2, ArrowLeft, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Question, Story } from "@shared/schema";
import logo from "@/assets/whypals-logo.png";

export default function BigWhyPage() {
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions/published"],
  });

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const getStoryTitle = (storyId: number) => {
    return stories?.find(s => s.id === storyId)?.title || "Unknown Story";
  };

  // Reads ?search=... from the URL (used by the "Explore Big Why" button on
  // story pages, which links here pre-filled with that story's title) and
  // seeds the search box with it. Editing the box afterward doesn't touch
  // the URL — it's just a starting point, not a synced filter state.
  const search = useSearch();
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(search).get("search") || "");

  useEffect(() => {
    const fromUrl = new URLSearchParams(search).get("search");
    if (fromUrl) setSearchQuery(fromUrl);
  }, [search]);

  const filteredQuestions = useMemo(() => {
    if (!questions) return questions;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) => {
      const storyTitle = getStoryTitle(item.storyId).toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        (item.answer || "").toLowerCase().includes(q) ||
        storyTitle.includes(q)
      );
    });
  }, [questions, stories, searchQuery]);

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={logo} alt="WhyPals Logo" className="h-12 w-12 object-contain" />
            <span className="hidden sm:inline font-heading text-2xl font-bold text-primary tracking-tight">WhyPals</span>
          </Link>
          
          <div className="flex items-center gap-3 md:gap-8 font-heading font-semibold text-muted-foreground text-sm md:text-base whitespace-nowrap">
            <Link href="/" className="hover:text-primary transition-colors">Listen</Link>
            <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
            <Link href="/big-why" className="text-primary transition-colors">Big Why?</Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-16 text-center">
          <div className="relative mb-6">
            <motion.div 
              className="absolute inset-0 bg-green-500 blur-xl opacity-40 rounded-3xl"
              animate={{ 
                opacity: [0.4, 0.7, 0.4],
                scale: [0.95, 1.1, 0.95],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="w-24 h-24 rounded-3xl bg-card border-2 border-green-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] relative z-10"
              initial={{ rotate: 3, y: 0 }}
              animate={{ 
                y: [0, -10, 0],
                rotate: [3, 6, 3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <HelpCircle className="w-12 h-12 text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
            </motion.div>
          </div>
          <h1 className="font-heading text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
            The Big Why?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Curious minds ask the best questions. Explore the database of answers to the most interesting "Whys" from our community.
          </p>

          <div className="relative w-full max-w-xl mt-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, question, or story title..."
              className="h-14 pl-14 pr-12 rounded-full text-lg shadow-sm"
              data-testid="input-big-why-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : questions?.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border border-border/50">
            <HelpCircle className="w-20 h-20 text-muted-foreground/50 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-muted-foreground">No questions answered yet</h3>
            <p className="text-muted-foreground mt-2 text-lg">Be the first to ask a Big Why on any story page!</p>
          </div>
        ) : filteredQuestions?.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border border-border/50">
            <Search className="w-20 h-20 text-muted-foreground/50 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-muted-foreground">No matches for "{searchQuery}"</h3>
            <p className="text-muted-foreground mt-2 text-lg">Try a different word, or clear the search to see every Big Why.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredQuestions?.map((q) => (
              <Card
                key={q.id}
                className="overflow-hidden border border-border/50 bg-card hover:shadow-lg transition-all duration-300 group rounded-2xl cursor-pointer flex flex-col h-full"
                onClick={() => setSelectedQuestion(q)}
              >
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <div className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
                    <Link
                      href={`/story/${q.storyId}`}
                      className="hover:underline hover:text-primary/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="opacity-70 mr-1">From:</span>
                      <span>{getStoryTitle(q.storyId)}</span>
                    </Link>
                  </div>
                  <CardTitle className="font-heading text-2xl leading-tight text-foreground group-hover:text-primary transition-colors">
                    {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col flex-grow">
                  <div className="prose prose-slate prose-lg">
                    <p className="text-muted-foreground leading-relaxed">
                      {q.answer}
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                      Asked by a curious pal
                    </span>
                    {q.answeredAt && (
                      <span className="font-mono opacity-70">
                        {format(new Date(q.answeredAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
            <DialogHeader>
              <div className="text-sm font-bold text-primary uppercase tracking-widest mb-2">
                <span className="opacity-70 mr-1">From:</span>
                <Link 
                  href={selectedQuestion ? `/story/${selectedQuestion.storyId}` : '#'} 
                  className="hover:underline hover:text-primary/80 transition-colors"
                >
                  {selectedQuestion && getStoryTitle(selectedQuestion.storyId)}
                </Link>
              </div>
              <DialogTitle className="font-heading text-3xl leading-tight text-foreground mb-4">
                {selectedQuestion?.question}
              </DialogTitle>
            </DialogHeader>
            <div className="prose prose-slate prose-lg mt-4 max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedQuestion?.answer}
              </p>
            </div>
            {selectedQuestion?.answeredAt && (
               <div className="mt-8 pt-4 border-t border-border/50 text-sm text-muted-foreground flex items-center justify-end">
                  Answered on {format(new Date(selectedQuestion.answeredAt), 'MMMM d, yyyy')}
               </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}