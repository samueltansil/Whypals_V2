import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle, XCircle, ArrowRight, Volume2, VolumeX, Sparkles } from "lucide-react";
import type { EmojiDecoderGameConfig } from "@shared/schema";
import { useGameAudio } from "@/hooks/useGameAudio";
import CongratulationsScreen from "./CongratulationsScreen";

interface EmojiDecoderGameProps {
  config: EmojiDecoderGameConfig;
  onComplete: (score: number) => void;
  onBack?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  backgroundMusicUrl?: string | null;
  soundEffectsEnabled?: boolean;
  pointsReward?: number;
}

export default function EmojiDecoderGame({
  config,
  onComplete,
  onBack,
  onTimeUpdate,
  backgroundMusicUrl,
  soundEffectsEnabled = true,
  pointsReward,
}: EmojiDecoderGameProps) {
  const rounds = config.rounds || [];
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
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

  const handleSelect = (index: number) => {
    if (answered) return;
    playSound("click");
    setSelected(index);
    setAnswered(true);

    if (index === rounds[current].correctIndex) {
      playSound("correct");
      setCorrectCount((prev) => prev + 1);
    } else {
      playSound("error");
    }
  };

  const handleNext = () => {
    playSound("click");
    if (current < rounds.length - 1) {
      setCurrent((prev) => prev + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setIsComplete(true);
      const finalCorrect = correctCount + (selected === rounds[current].correctIndex ? 1 : 0);
      const scorePercentage = finalCorrect / rounds.length;
      const calculatedScore = Math.max(10, Math.min(100, Math.round(scorePercentage * 100)));
      setFinalScore(calculatedScore);
      onComplete(calculatedScore);
    }
  };

  const restart = () => {
    playSound("click");
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setIsComplete(false);
    setGameTime(0);
  };

  if (!rounds || rounds.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No rounds available for this game.
      </div>
    );
  }

  if (isComplete) {
    const finalCorrect = Math.min(rounds.length, correctCount);
    return (
      <CongratulationsScreen
        score={finalScore}
        maxScore={100}
        stats={[
          { label: "Correct", value: `${finalCorrect}/${rounds.length}` },
          { label: "Accuracy", value: `${Math.round((finalCorrect / rounds.length) * 100)}%` },
          { label: "Time", value: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, "0")}` },
        ]}
        winMessage={config.winMessage || "You cracked the code!"}
        onPlayAgain={restart}
        onBack={onBack}
        soundEffectsEnabled={soundEffectsEnabled}
        pointsReward={pointsReward}
      />
    );
  }

  const round = rounds[current];

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between text-sm">
        <span className="font-heading">
          Round <strong>{current + 1}</strong> of {rounds.length}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span>
            Score: <strong className="text-primary">{correctCount}</strong>
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
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-3">
        <div
          className="bg-primary h-3 rounded-full transition-all duration-300"
          style={{ width: `${((current + 1) / rounds.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className="space-y-6"
        >
          <h3 className="text-lg md:text-xl font-heading font-bold text-center px-2 flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="w-5 h-5 text-primary" /> What does this mean?
          </h3>

          <div className="rounded-2xl p-8 text-center bg-primary/5 border-2 border-primary/20">
            <span className="text-6xl md:text-7xl leading-none tracking-wide">{round.emojiClue}</span>
          </div>

          <div className="space-y-3">
            {round.options.map((option, index) => {
              const isSelected = selected === index;
              const isCorrect = index === round.correctIndex;

              let buttonStyle = "bg-white border-2 border-muted hover:border-primary/50";
              if (answered) {
                if (isCorrect) {
                  buttonStyle = "bg-green-50 border-2 border-green-500";
                } else if (isSelected && !isCorrect) {
                  buttonStyle = "bg-red-50 border-2 border-red-500";
                }
              } else if (isSelected) {
                buttonStyle = "bg-primary/10 border-2 border-primary";
              }

              return (
                <motion.button
                  key={index}
                  onClick={() => handleSelect(index)}
                  disabled={answered}
                  className={`w-full p-4 md:p-5 rounded-xl text-left transition-all ${buttonStyle} ${
                    !answered ? "cursor-pointer" : "cursor-default"
                  }`}
                  whileHover={!answered ? { scale: 1.02 } : {}}
                  whileTap={!answered ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-base md:text-lg">{option}</span>
                    {answered && isCorrect && <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
                    {answered && isSelected && !isCorrect && (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {answered && round.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${selected === round.correctIndex ? "bg-green-50" : "bg-orange-50"}`}
            >
              <p className="text-sm md:text-base">
                <strong>{selected === round.correctIndex ? "Cracked it! " : "Not quite. "}</strong>
                {round.explanation}
              </p>
            </motion.div>
          )}

          {answered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
              <Button onClick={handleNext} className="gap-2 text-lg px-6 py-5">
                {current < rounds.length - 1 ? (
                  <>
                    Next Round <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    See Results <Trophy className="w-5 h-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
