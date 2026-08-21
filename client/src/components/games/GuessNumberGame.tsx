import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Target, Volume2, VolumeX } from "lucide-react";
import type { GuessNumberGameConfig } from "@shared/schema";
import { useGameAudio } from "@/hooks/useGameAudio";
import CongratulationsScreen from "./CongratulationsScreen";

interface GuessNumberGameProps {
  config: GuessNumberGameConfig;
  onComplete: (score: number) => void;
  onBack?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  backgroundMusicUrl?: string | null;
  soundEffectsEnabled?: boolean;
  pointsReward?: number;
}

export default function GuessNumberGame({
  config,
  onComplete,
  onBack,
  onTimeUpdate,
  backgroundMusicUrl,
  soundEffectsEnabled = true,
  pointsReward,
}: GuessNumberGameProps) {
  const maxGuesses = config.maxGuesses || 6;
  const [guesses, setGuesses] = useState<{ value: number; direction: "higher" | "lower" | "correct" }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [won, setWon] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  const { playSound, setBackgroundMusicMuted } = useGameAudio({ backgroundMusicUrl, soundEffectsEnabled });
  const [isMuted, setIsMuted] = useState(false);

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

  const finish = (guessCount: number, didWin: boolean) => {
    setIsComplete(true);
    setWon(didWin);
    const calculatedScore = didWin
      ? Math.max(20, Math.round(100 - ((guessCount - 1) / maxGuesses) * 80))
      : 10;
    setFinalScore(calculatedScore);
    onComplete(calculatedScore);
  };

  const handleGuess = () => {
    const num = Number(inputValue);
    if (!Number.isFinite(num) || isComplete) return;

    playSound("click");
    const direction: "higher" | "lower" | "correct" =
      num === config.answer ? "correct" : num < config.answer ? "higher" : "lower";
    const newGuesses = [...guesses, { value: num, direction }];
    setGuesses(newGuesses);
    setInputValue("");

    if (direction === "correct") {
      playSound("correct");
      setTimeout(() => finish(newGuesses.length, true), 400);
    } else if (newGuesses.length >= maxGuesses) {
      playSound("error");
      setTimeout(() => finish(newGuesses.length, false), 400);
    } else {
      playSound("click");
    }
  };

  const restart = () => {
    playSound("click");
    setGuesses([]);
    setInputValue("");
    setIsComplete(false);
    setWon(false);
    setGameTime(0);
  };

  if (!config.question || !Number.isFinite(config.answer)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This number-guess game isn't set up correctly yet.
      </div>
    );
  }

  if (isComplete) {
    return (
      <CongratulationsScreen
        score={finalScore}
        maxScore={100}
        stats={[
          { label: "The Answer", value: `${config.answer}${config.unit ? ` ${config.unit}` : ""}` },
          { label: "Guesses Used", value: `${guesses.length}/${maxGuesses}` },
          { label: "Time", value: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, "0")}` },
        ]}
        winMessage={won ? config.winMessage || "You nailed it!" : `So close! The answer was ${config.answer}${config.unit ? ` ${config.unit}` : ""}.`}
        onPlayAgain={restart}
        onBack={onBack}
        soundEffectsEnabled={soundEffectsEnabled}
        pointsReward={pointsReward}
      />
    );
  }

  const guessesLeft = maxGuesses - guesses.length;
  const lastGuess = guesses[guesses.length - 1];

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between text-sm">
        <span className="font-heading flex items-center gap-1">
          <Target className="w-4 h-4" /> {guessesLeft} guess{guessesLeft === 1 ? "" : "es"} left
        </span>
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

      <div className="rounded-2xl p-6 text-center bg-primary/5 border-2 border-primary/20">
        <p className="text-xl md:text-2xl font-heading font-bold">{config.question}</p>
        {config.unit && <p className="text-sm text-muted-foreground mt-1">(answer in {config.unit})</p>}
      </div>

      <AnimatePresence mode="wait">
        {lastGuess && (
          <motion.div
            key={guesses.length}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl font-heading font-bold text-lg ${
              lastGuess.direction === "higher" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
            }`}
          >
            {lastGuess.direction === "higher" ? (
              <>
                <ArrowUp className="w-5 h-5" /> Go higher!
              </>
            ) : (
              <>
                <ArrowDown className="w-5 h-5" /> Go lower!
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <Input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGuess()}
          placeholder="Type your guess..."
          className="text-lg text-center"
        />
        <Button onClick={handleGuess} disabled={inputValue.trim() === ""} className="px-6">
          Guess
        </Button>
      </div>

      {guesses.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {guesses.map((g, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground"
            >
              {g.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
