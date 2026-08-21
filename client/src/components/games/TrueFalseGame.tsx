import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, Check, X, Volume2, VolumeX, Zap } from "lucide-react";
import type { TrueFalseGameConfig } from "@shared/schema";
import { useGameAudio } from "@/hooks/useGameAudio";
import CongratulationsScreen from "./CongratulationsScreen";

interface TrueFalseGameProps {
  config: TrueFalseGameConfig;
  onComplete: (score: number) => void;
  onBack?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  backgroundMusicUrl?: string | null;
  soundEffectsEnabled?: boolean;
  pointsReward?: number;
}

export default function TrueFalseGame({
  config,
  onComplete,
  onBack,
  onTimeUpdate,
  backgroundMusicUrl,
  soundEffectsEnabled = true,
  pointsReward,
}: TrueFalseGameProps) {
  const statements = config.statements || [];
  const secondsPerStatement = config.secondsPerStatement || 8;

  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(secondsPerStatement);
  const [isComplete, setIsComplete] = useState(false);
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

  const finishGame = useCallback(
    (finalCorrect: number) => {
      setIsComplete(true);
      const scorePercentage = finalCorrect / statements.length;
      const calculatedScore = Math.max(10, Math.min(100, Math.round(scorePercentage * 100)));
      setFinalScore(calculatedScore);
      onComplete(calculatedScore);
    },
    [statements.length, onComplete]
  );

  const goToNext = useCallback(
    (wasCorrect: boolean) => {
      const newCorrectCount = correctCount + (wasCorrect ? 1 : 0);
      setCorrectCount(newCorrectCount);
      if (current < statements.length - 1) {
        setTimeout(() => {
          setCurrent((prev) => prev + 1);
          setAnswered(false);
          setLastCorrect(null);
          setTimeLeft(secondsPerStatement);
        }, 900);
      } else {
        setTimeout(() => finishGame(newCorrectCount), 900);
      }
    },
    [correctCount, current, statements.length, secondsPerStatement, finishGame]
  );

  const handleAnswer = (choice: boolean) => {
    if (answered || statements.length === 0) return;
    const statement = statements[current];
    const correct = choice === statement.isTrue;

    setAnswered(true);
    setLastCorrect(correct);

    if (correct) {
      playSound("correct");
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else {
      playSound("error");
      setStreak(0);
    }

    goToNext(correct);
  };

  // Countdown per statement — running out counts as wrong.
  useEffect(() => {
    if (isComplete || answered || statements.length === 0) return;
    if (timeLeft <= 0) {
      handleAnswer(!statements[current].isTrue); // guaranteed wrong, marks it incorrect
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered, isComplete, current]);

  const restart = () => {
    playSound("click");
    setCurrent(0);
    setAnswered(false);
    setLastCorrect(null);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(secondsPerStatement);
    setIsComplete(false);
    setGameTime(0);
  };

  if (!statements || statements.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No statements available for this game.
      </div>
    );
  }

  if (isComplete) {
    return (
      <CongratulationsScreen
        score={finalScore}
        maxScore={100}
        stats={[
          { label: "Correct", value: `${correctCount}/${statements.length}` },
          { label: "Best Streak", value: bestStreak },
          { label: "Time", value: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, "0")}` },
        ]}
        winMessage={config.winMessage || "Speedy work!"}
        onPlayAgain={restart}
        onBack={onBack}
        soundEffectsEnabled={soundEffectsEnabled}
        pointsReward={pointsReward}
      />
    );
  }

  const statement = statements[current];

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between text-sm">
        <span className="font-heading">
          Statement <strong>{current + 1}</strong> of {statements.length}
        </span>
        <span className="flex items-center gap-3 text-muted-foreground">
          {streak > 1 && (
            <span className="flex items-center gap-1 text-orange-500 font-bold">
              <Zap className="w-4 h-4" /> {streak}
            </span>
          )}
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
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${timeLeft <= 3 ? "bg-red-500" : "bg-primary"}`}
          animate={{ width: `${(timeLeft / secondsPerStatement) * 100}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="space-y-8"
        >
          <div
            className={`rounded-2xl p-8 text-center border-2 transition-colors ${
              answered
                ? lastCorrect
                  ? "bg-green-50 border-green-500"
                  : "bg-red-50 border-red-500"
                : "bg-white border-muted"
            }`}
          >
            <p className="text-xl md:text-2xl font-heading font-bold">{statement.statement}</p>
            {answered && statement.explanation && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm md:text-base mt-4 text-muted-foreground"
              >
                {statement.explanation}
              </motion.p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              onClick={() => handleAnswer(true)}
              disabled={answered}
              whileHover={!answered ? { scale: 1.03 } : {}}
              whileTap={!answered ? { scale: 0.97 } : {}}
              className={`flex items-center justify-center gap-2 py-6 rounded-xl font-heading font-bold text-lg border-2 transition-all ${
                answered
                  ? statement.isTrue
                    ? "bg-green-100 border-green-500 text-green-700"
                    : "bg-white border-muted text-muted-foreground"
                  : "bg-green-50 border-green-300 text-green-700 hover:border-green-500 cursor-pointer"
              }`}
            >
              <Check className="w-6 h-6" /> True
            </motion.button>
            <motion.button
              onClick={() => handleAnswer(false)}
              disabled={answered}
              whileHover={!answered ? { scale: 1.03 } : {}}
              whileTap={!answered ? { scale: 0.97 } : {}}
              className={`flex items-center justify-center gap-2 py-6 rounded-xl font-heading font-bold text-lg border-2 transition-all ${
                answered
                  ? !statement.isTrue
                    ? "bg-red-100 border-red-500 text-red-700"
                    : "bg-white border-muted text-muted-foreground"
                  : "bg-red-50 border-red-300 text-red-700 hover:border-red-500 cursor-pointer"
              }`}
            >
              <X className="w-6 h-6" /> False
            </motion.button>
          </div>

          {current === statements.length - 1 && answered && (
            <div className="flex justify-center text-muted-foreground text-sm">
              <Trophy className="w-4 h-4 mr-1" /> Wrapping up...
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
