import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle, XCircle, ArrowRight, Volume2, VolumeX } from "lucide-react";
import type { FillBlankGameConfig } from "@shared/schema";
import { useGameAudio } from "@/hooks/useGameAudio";
import CongratulationsScreen from "./CongratulationsScreen";

interface FillBlankGameProps {
  config: FillBlankGameConfig;
  onComplete: (score: number) => void;
  onBack?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  backgroundMusicUrl?: string | null;
  soundEffectsEnabled?: boolean;
  pointsReward?: number;
}

export default function FillBlankGame({
  config,
  onComplete,
  onBack,
  onTimeUpdate,
  backgroundMusicUrl,
  soundEffectsEnabled = true,
  pointsReward,
}: FillBlankGameProps) {
  const [currentBlank, setCurrentBlank] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  const { playSound, setBackgroundMusicMuted } = useGameAudio({ backgroundMusicUrl, soundEffectsEnabled });
  const [isMuted, setIsMuted] = useState(false);
  const blanks = config.blanks || [];

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

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return;

    playSound("click");
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);

    if (answerIndex === blanks[currentBlank].correctIndex) {
      playSound("correct");
      setCorrectAnswers((prev) => prev + 1);
    } else {
      playSound("error");
    }
  };

  const handleNext = () => {
    playSound("click");
    if (currentBlank < blanks.length - 1) {
      setCurrentBlank((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      const finalCorrect = correctAnswers + (selectedAnswer === blanks[currentBlank].correctIndex ? 1 : 0);
      const scorePercentage = finalCorrect / blanks.length;
      const calculatedScore = Math.max(10, Math.min(100, Math.round(scorePercentage * 100)));
      setFinalScore(calculatedScore);
      onComplete(calculatedScore);
    }
  };

  const restart = () => {
    playSound("click");
    setCurrentBlank(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectAnswers(0);
    setIsComplete(false);
    setGameTime(0);
  };

  if (!blanks || blanks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No sentences available for this game.
      </div>
    );
  }

  if (isComplete) {
    const finalCorrect = Math.min(blanks.length, correctAnswers);
    return (
      <CongratulationsScreen
        score={finalScore}
        maxScore={100}
        stats={[
          { label: "Correct", value: `${finalCorrect}/${blanks.length}` },
          { label: "Accuracy", value: `${Math.round((finalCorrect / blanks.length) * 100)}%` },
          { label: "Time", value: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, "0")}` },
        ]}
        winMessage={config.winMessage || "Great reading!"}
        onPlayAgain={restart}
        onBack={onBack}
        soundEffectsEnabled={soundEffectsEnabled}
        pointsReward={pointsReward}
      />
    );
  }

  const blank = blanks[currentBlank];
  const isCorrect = selectedAnswer === blank.correctIndex;
  // Render the sentence, styling the blank placeholder distinctly.
  const parts = blank.sentence.split(/_{2,}/);

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between text-sm">
        <span className="font-heading">
          Sentence <strong>{currentBlank + 1}</strong> of {blanks.length}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span>
            Score: <strong className="text-primary">{correctAnswers}</strong>
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
          style={{ width: `${((currentBlank + 1) / blanks.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentBlank}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className="space-y-6"
        >
          <h3 className="text-xl md:text-2xl font-heading font-bold text-center px-2 leading-relaxed">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < parts.length - 1 && (
                  <span className="inline-block mx-1 px-3 py-0.5 rounded-lg bg-primary/10 border-b-4 border-primary text-primary">
                    {isAnswered ? blank.options[blank.correctIndex] : "___"}
                  </span>
                )}
              </span>
            ))}
          </h3>

          <div className="space-y-3">
            {blank.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectAnswer = index === blank.correctIndex;

              let buttonStyle = "bg-white border-2 border-muted hover:border-primary/50";
              if (isAnswered) {
                if (isCorrectAnswer) {
                  buttonStyle = "bg-green-50 border-2 border-green-500";
                } else if (isSelected && !isCorrectAnswer) {
                  buttonStyle = "bg-red-50 border-2 border-red-500";
                }
              } else if (isSelected) {
                buttonStyle = "bg-primary/10 border-2 border-primary";
              }

              return (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`w-full p-4 md:p-5 rounded-xl text-left transition-all ${buttonStyle} ${
                    !isAnswered ? "cursor-pointer" : "cursor-default"
                  }`}
                  whileHover={!isAnswered ? { scale: 1.02 } : {}}
                  whileTap={!isAnswered ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-base md:text-lg">{option}</span>
                    {isAnswered && isCorrectAnswer && <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
                    {isAnswered && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {isAnswered && blank.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${isCorrect ? "bg-green-50" : "bg-orange-50"}`}
            >
              <p className="text-sm md:text-base">
                <strong>{isCorrect ? "Correct! " : "Not quite. "}</strong>
                {blank.explanation}
              </p>
            </motion.div>
          )}

          {isAnswered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
              <Button onClick={handleNext} className="gap-2 text-lg px-6 py-5">
                {currentBlank < blanks.length - 1 ? (
                  <>
                    Next Sentence <ArrowRight className="w-5 h-5" />
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
