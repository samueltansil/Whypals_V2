
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lightbulb, Delete, Volume2, VolumeX } from "lucide-react";
import type { PictureScrambleGameConfig } from "@shared/schema";
import { useGameAudio } from "@/hooks/useGameAudio";
import CongratulationsScreen from "./CongratulationsScreen";

interface PictureScrambleGameProps {
  config: PictureScrambleGameConfig;
  onComplete: (score: number) => void;
  onBack?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  backgroundMusicUrl?: string | null;
  soundEffectsEnabled?: boolean;
  pointsReward?: number;
}

function scrambleLetters(word: string): string[] {
  const letters = word.toUpperCase().split("");
  // Re-shuffle until it's not already in order (avoids a trivially "solved" start)
  let attempts = 0;
  let shuffled = letters;
  do {
    shuffled = [...letters].sort(() => Math.random() - 0.5);
    attempts++;
  } while (shuffled.join("") === letters.join("") && attempts < 10 && letters.length > 1);
  return shuffled;
}

export default function PictureScrambleGame({
  config,
  onComplete,
  onBack,
  onTimeUpdate,
  backgroundMusicUrl,
  soundEffectsEnabled = true,
  pointsReward,
}: PictureScrambleGameProps) {
  const word = (config.word || "").toUpperCase().trim();
  const [tileLetters, setTileLetters] = useState<{ char: string; id: number; used: boolean }[]>([]);
  const [guess, setGuess] = useState<{ char: string; tileId: number }[]>([]);
  const [wrongShake, setWrongShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  const { playSound, setBackgroundMusicMuted } = useGameAudio({ backgroundMusicUrl, soundEffectsEnabled });
  const [isMuted, setIsMuted] = useState(false);

  const scrambled = useMemo(() => scrambleLetters(word), [word]);

  useEffect(() => {
    setTileLetters(scrambled.map((char, i) => ({ char, id: i, used: false })));
  }, [scrambled]);

  useEffect(() => {
    if (isComplete) return;
    const timer = setInterval(() => {
      setGameTime((prev) => {
        onTimeUpdate?.(1);
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isComplete, onTimeUpdate]);

  const finishGame = useCallback(() => {
    // Score rewards fewer wrong attempts and using the hint less.
    const penalty = attempts * 10 + (showHint ? 15 : 0);
    const calculatedScore = Math.max(10, Math.min(100, 100 - penalty));
    setFinalScore(calculatedScore);
    setIsComplete(true);
    onComplete(calculatedScore);
  }, [attempts, showHint, onComplete]);

  const handleTileClick = (tile: { char: string; id: number }) => {
    if (isComplete) return;
    playSound("click");
    setTileLetters((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
    setGuess((prev) => {
      const next = [...prev, { char: tile.char, tileId: tile.id }];
      if (next.length === word.length) {
        const guessedWord = next.map((g) => g.char).join("");
        if (guessedWord === word) {
          playSound("correct");
          setTimeout(finishGame, 500);
        } else {
          playSound("error");
          setAttempts((a) => a + 1);
          setWrongShake(true);
          setTimeout(() => {
            setWrongShake(false);
            setGuess([]);
            setTileLetters((tiles) => tiles.map((t) => ({ ...t, used: false })));
          }, 700);
        }
      }
      return next;
    });
  };

  const handleClear = () => {
    if (guess.length === 0) return;
    playSound("click");
    setGuess([]);
    setTileLetters((tiles) => tiles.map((t) => ({ ...t, used: false })));
  };

  const restart = () => {
    playSound("click");
    setTileLetters(scrambleLetters(word).map((char, i) => ({ char, id: i, used: false })));
    setGuess([]);
    setAttempts(0);
    setShowHint(false);
    setIsComplete(false);
    setGameTime(0);
  };

  if (!word || !config.imageUrl) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This picture scramble isn't set up correctly yet.
      </div>
    );
  }

  if (isComplete) {
    return (
      <CongratulationsScreen
        score={finalScore}
        maxScore={100}
        stats={[
          { label: "The Word", value: word },
          { label: "Wrong Tries", value: attempts },
          { label: "Time", value: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, "0")}` },
        ]}
        winMessage={config.winMessage || "You got it!"}
        onPlayAgain={restart}
        onBack={onBack}
        soundEffectsEnabled={soundEffectsEnabled}
        pointsReward={pointsReward}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between text-sm">
        <span className="font-heading">Unscramble the word!</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setBackgroundMusicMuted(!isMuted);
            setIsMuted(!isMuted);
          }}
          aria-label={isMuted ? "Unmute background music" : "Mute background music"}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </Button>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 border-muted aspect-video bg-muted">
        <img src={config.imageUrl} alt="Guess what this is" className="w-full h-full object-cover" />
      </div>

      {config.clue && showHint && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-muted-foreground italic"
        >
          "{config.clue}"
        </motion.p>
      )}

      <motion.div
        animate={wrongShake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {Array.from({ length: word.length }).map((_, i) => {
          const filled = guess[i];
          return (
            <div
              key={i}
              className="w-10 h-12 md:w-12 md:h-14 rounded-lg border-2 border-primary/40 bg-white flex items-center justify-center font-heading font-bold text-xl md:text-2xl"
            >
              <AnimatePresence>
                {filled && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    {filled.char}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>

      <div className="flex flex-wrap justify-center gap-2">
        {tileLetters.map((tile) => (
          <motion.button
            key={tile.id}
            onClick={() => handleTileClick(tile)}
            disabled={tile.used}
            whileHover={!tile.used ? { scale: 1.08 } : {}}
            whileTap={!tile.used ? { scale: 0.92 } : {}}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-lg font-heading font-bold text-lg md:text-xl border-2 transition-all ${
              tile.used
                ? "opacity-0 pointer-events-none"
                : "bg-primary/10 border-primary/40 hover:border-primary cursor-pointer"
            }`}
          >
            {tile.char}
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={handleClear} className="gap-2">
          <Delete className="w-4 h-4" /> Clear
        </Button>
        {config.clue && !showHint && (
          <Button variant="outline" onClick={() => setShowHint(true)} className="gap-2">
            <Lightbulb className="w-4 h-4" /> Hint
          </Button>
        )}
      </div>
    </div>
  );
}
