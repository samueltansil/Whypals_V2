import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Play, Trophy, Clock, Users, Gamepad2, CheckCircle, Star, Puzzle, Target, Sparkles, HelpCircle, Calendar, BarChart2, PenLine, Zap, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@assets/whypals-logo.png";
import { motion } from "framer-motion";
import { usePoints } from "@/hooks/usePoints";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoryGame } from "@shared/schema";
import PuzzleGame from "@/components/games/PuzzleGame";
import WhackAMoleGame from "@/components/games/WhackAMoleGame";
import MemoryMatchGame from "@/components/games/MemoryMatchGame";
import QuizGame from "@/components/games/QuizGame";
import TimelineGame from "@/components/games/TimelineGame";
import PollGame from "@/components/games/PollGame";
import FillBlankGame from "@/components/games/FillBlankGame";
import TrueFalseGame from "@/components/games/TrueFalseGame";
import PictureScrambleGame from "@/components/games/PictureScrambleGame";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useAuth } from "@/hooks/useAuth";

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
};

export default function GamePreview() {
  const params = useParams<{ id: string }>();
  const gameId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const { points, refetchPoints, addPoints } = usePoints();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  
  useActivityTracker('playing', { enabled: gameStarted && !gameCompleted });

  const handleBackToGames = () => {
    navigate("/games");
  };

  const { data: game, isLoading, error } = useQuery<StoryGame>({
    queryKey: ["/api/games", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error("Game not found");
      return res.json();
    },
    enabled: gameId > 0,
  });

  const { startBackgroundMusic, stopBackgroundMusic } = useGameAudio({
    backgroundMusicUrl: (game as any)?.backgroundMusicUrl,
    soundEffectsEnabled: false,
  });

  const handleStartGame = () => {
    if (!isAuthenticated && game?.gameType !== 'poll') {
      toast({ title: "Log in to play game" });
      navigate(`/login?redirect=${encodeURIComponent(`/game/${gameId}`)}`);
      return;
    }
    startBackgroundMusic();
    setGameStarted(true);
    setGameCompleted(false);
    setFinalScore(0);
  };

  const handleBackToPreview = () => {
    stopBackgroundMusic();
    setGameStarted(false);
  };

  const handleGameComplete = async (score: number) => {
    stopBackgroundMusic();
    setFinalScore(score);
    setGameCompleted(true);
    
    if (game) {
      const pointsEarned = Math.round((score / 100) * game.pointsReward);
      try {
        const res = await fetch(`/api/games/${game.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ score }),
        });
        if (res.ok) {
          const data = await res.json();
          refetchPoints();
          toast({
            title: `+${data.pointsEarned} points!`,
            description: data.message,
          });
        } else {
          addPoints(pointsEarned);
          toast({
            title: `+${pointsEarned} points!`,
            description: "Great job completing the game!",
          });
        }
      } catch (error) {
        console.error('Failed to complete game:', error);
        addPoints(pointsEarned);
        toast({
          title: `+${pointsEarned} points!`,
          description: "Great job completing the game!",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-heading">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="font-heading text-3xl font-bold mb-4">Game not found</h1>
          <Link href="/games">
            <Button>Back to games</Button>
          </Link>
        </div>
      </div>
    );
  }

  const GameIcon = GAME_TYPE_ICONS[game.gameType] || Gamepad2;
  const colorClass = GAME_TYPE_COLORS[game.gameType] || "bg-gray-100 text-gray-600";

  if (gameStarted) {
    return (
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleBackToPreview} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <h1 className="font-heading text-xl font-bold">{game.title}</h1>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
              <Trophy className="w-5 h-5 text-teal-600" />
              <span className="font-heading font-semibold">{points.toLocaleString()} pts</span>
            </div>
          </div>
        </nav>
        <main className="flex-grow container mx-auto px-4 py-8">
          {game.gameType === "puzzle" && (
            <PuzzleGame 
              config={game.config as any} 
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "whack" && (
            <WhackAMoleGame 
              config={game.config as any} 
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "match" && (
            <MemoryMatchGame 
              config={game.config as any} 
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "quiz" && (
            <QuizGame 
              config={game.config as any} 
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "timeline" && (
            <TimelineGame 
              config={game.config as any} 
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "poll" && (
            <PollGame
              gameId={game.id}
              config={game.config as any}
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "fillblank" && (
            <FillBlankGame
              config={game.config as any}
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "truefalse" && (
            <TrueFalseGame
              config={game.config as any}
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
          {game.gameType === "scramble" && (
            <PictureScrambleGame
              config={game.config as any}
              onComplete={handleGameComplete}
              onBack={handleBackToGames}
              backgroundMusicUrl={(game as any).backgroundMusicUrl}
              soundEffectsEnabled={(game as any).soundEffectsEnabled !== false}
              pointsReward={game.pointsReward || 0}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            WhyPals
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-heading font-semibold text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/games" className="text-primary transition-colors">Games</Link>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full" data-testid="points-tracker">
            <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="font-heading font-semibold text-slate-700 dark:text-slate-200">
              {points.toLocaleString()} pts
            </span>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <div className="relative h-64 md:h-80 overflow-hidden">
          {game.thumbnail ? (
            <img 
              src={game.thumbnail} 
              alt={game.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full ${colorClass} flex items-center justify-center`}>
              <GameIcon className="w-24 h-24 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorClass} mb-3`}>
                {game.gameType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link href="/games">
            <Button variant="ghost" className="mb-6 -ml-2 gap-2" data-testid="button-back-games">
              <ArrowLeft className="w-4 h-4" />
              Back to games
            </Button>
          </Link>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl ${colorClass} flex items-center justify-center`}>
                  <GameIcon className="w-8 h-8" />
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground" data-testid="game-title">
                  {game.title}
                </h1>
              </div>

              <p className="text-lg text-muted-foreground mb-6" data-testid="game-description">
                {game.description || "A fun learning game!"}
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">5-10 mins</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">1 Player</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Up to {game.pointsReward} pts</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {gameCompleted ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-6 py-3 rounded-full font-heading font-bold">
                      <CheckCircle className="w-6 h-6" />
                      Score: {finalScore}% 
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        size="lg"
                        className="rounded-full"
                        onClick={handleStartGame}
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Play Again
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      size="lg" 
                      className="rounded-full gap-3 text-lg px-8 py-6 shadow-lg shadow-primary/30"
                      data-testid="button-start-game"
                      onClick={handleStartGame}
                    >
                      <Play className="w-6 h-6 fill-current" />
                      Start Game
                    </Button>
                  </motion.div>
                )}
              </div>

              {game.howToPlay && (
                <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/20">
                  <h3 className="font-heading text-xl font-bold mb-3 flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    How to Play
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-line">{game.howToPlay}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {game.funFacts && (
                <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl p-5">
                  <h3 className="font-heading text-lg font-bold mb-2 text-orange-700 dark:text-orange-300 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Fun Facts!
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200 whitespace-pre-line">
                    {game.funFacts}
                  </p>
                </div>
              )}

              {game.linkedStoryTitle && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
                  <h3 className="font-heading text-lg font-bold mb-2 text-primary">Related Story</h3>
                  <p className="text-sm text-muted-foreground">
                    This game is about: <strong>{game.linkedStoryTitle}</strong>
                  </p>
                </div>
              )}

              {!game.funFacts && (
                <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl p-5">
                  <h3 className="font-heading text-lg font-bold mb-2 text-orange-700 dark:text-orange-300">Fun Fact!</h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Playing educational games helps your brain grow stronger! Just 15 minutes of learning games each day can improve memory and problem-solving skills.
                  </p>
                </div>
              )}
            </div>
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
