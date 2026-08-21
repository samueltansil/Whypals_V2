import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Edit, Trash2, ArrowLeft, Save, X, Eye, EyeOff, Search, Filter, Gamepad2, Lock, Upload, Loader2, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/whypals-logo.png";
import type { StoryGame, PuzzleGameConfig, WhackGameConfig, MatchGameConfig, QuizGameConfig, TimelineGameConfig, PollGameConfig, FillBlankGameConfig, TrueFalseGameConfig, PictureScrambleGameConfig } from "@shared/schema";
import { CATEGORIES as ALL_CATEGORIES } from "@/lib/data";

const GAME_TYPES = [
  { value: "puzzle", label: "Puzzle", icon: "🧩" },
  { value: "whack", label: "Whack-a-Mole", icon: "🎯" },
  { value: "match", label: "Memory Match", icon: "🃏" },
  { value: "quiz", label: "Quiz", icon: "❓" },
  { value: "timeline", label: "Timeline", icon: "📅" },
  { value: "poll", label: "Poll", icon: "📊" },
  { value: "fillblank", label: "Fill in the Blank", icon: "✏️" },
  { value: "truefalse", label: "True/False Speed Round", icon: "⚡" },
  { value: "scramble", label: "Picture Word Scramble", icon: "🖼️" },
];

const CATEGORIES = ALL_CATEGORIES.map(c => c.id);

async function validateSession(): Promise<boolean> {
  try {
    const sessionRes = await fetch("/api/admin/session", { credentials: "include" });
    if (sessionRes.ok) {
      return true;
    }
  } catch {}
  return false;
}

function AdminLoginDialog({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        toast({ title: "Admin access granted!" });
        onSuccess();
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-2">Enter the admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Access Admin Panel"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/">
            <Button variant="link" size="sm">Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ImageUploadField({ 
  label, 
  value, 
  onChange, 
  placeholder = "https://...",
  showPreview = true 
}: { 
  label: string; 
  value: string; 
  onChange: (url: string) => void; 
  placeholder?: string;
  showPreview?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/admin/upload/game-image', {
        method: 'POST',
        body: formData,
        credentials: "include",
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const { imageUrl } = await uploadRes.json();
      onChange(imageUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
      </div>
      {showPreview && value && (
        <img src={value} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
      )}
    </div>
  );
}

function PuzzleConfigEditor({ config, onChange }: { config: PuzzleGameConfig; onChange: (config: PuzzleGameConfig) => void }) {
  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Puzzle Image"
        value={config.imageUrl || ""}
        onChange={(url) => onChange({ ...config, imageUrl: url })}
        placeholder="https://example.com/image.jpg"
      />
      <div className="space-y-2">
        <Label>Grid Size</Label>
        <Select value={String(config.gridSize || 3)} onValueChange={(v) => onChange({ ...config, gridSize: parseInt(v) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3x3 (Easy)</SelectItem>
            <SelectItem value="4">4x4 (Medium)</SelectItem>
            <SelectItem value="5">5x5 (Hard)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Hint Text (optional)</Label>
        <Input
          value={config.hintText || ""}
          onChange={(e) => onChange({ ...config, hintText: e.target.value })}
          placeholder="Click two pieces to swap them!"
        />
      </div>
      <div className="space-y-2">
        <Label>Win Message</Label>
        <Input
          value={config.winMessage || ""}
          onChange={(e) => onChange({ ...config, winMessage: e.target.value })}
          placeholder="Puzzle Complete!"
        />
      </div>
    </div>
  );
}

function MultiImageUploadField({ 
  label, 
  values, 
  onChange 
}: { 
  label: string; 
  values: string[]; 
  onChange: (urls: string[]) => void; 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/admin/upload/game-image', {
        method: 'POST',
        body: formData,
        credentials: "include",
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const { imageUrl } = await uploadRes.json();
      onChange([...values, imageUrl]);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Upload Image
          </Button>
        </div>
      </div>
      <Textarea
        value={values.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
        placeholder="https://example.com/image1.png&#10;https://example.com/image2.png"
        rows={3}
      />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} alt={`Image ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
              <button
                type="button"
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WhackConfigEditor({ config, onChange }: { config: WhackGameConfig; onChange: (config: WhackGameConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ImageUploadField
          label="Target Image"
          value={config.targetImage || ""}
          onChange={(url) => onChange({ ...config, targetImage: url })}
          placeholder="https://example.com/target.png"
        />
        <div className="space-y-2">
          <Label>Target Label</Label>
          <Input
            value={config.targetLabel || ""}
            onChange={(e) => onChange({ ...config, targetLabel: e.target.value })}
            placeholder="Mole"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hole Outer Color</Label>
          <Input
            type="color"
            value={config.holeOuterColor || "#9CA3AF"}
            onChange={(e) => onChange({ ...config, holeOuterColor: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Hole Inner Color</Label>
          <Input
            type="color"
            value={config.holeInnerColor || "#7B4B32"}
            onChange={(e) => onChange({ ...config, holeInnerColor: e.target.value })}
          />
        </div>
      </div>
      <MultiImageUploadField
        label="Distractor Images"
        values={config.distractorImages || []}
        onChange={(urls) => onChange({ ...config, distractorImages: urls })}
      />
      <div className="space-y-2">
        <Label>Distractor Labels (one per line)</Label>
        <Textarea
          value={(config.distractorLabels || []).join("\n")}
          onChange={(e) => onChange({ ...config, distractorLabels: e.target.value.split("\n").filter(Boolean) })}
          placeholder="Rock&#10;Flower"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Game Duration (seconds)</Label>
          <Input
            type="number"
            value={config.duration || 30}
            onChange={(e) => onChange({ ...config, duration: parseInt(e.target.value) })}
          />
        </div>
        <ImageUploadField
          label="Background Image (optional)"
          value={config.backgroundImage || ""}
          onChange={(url) => onChange({ ...config, backgroundImage: url })}
          showPreview={false}
        />
      </div>
    </div>
  );
}

function InlineImageUploadButton({ onUpload }: { onUpload: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/admin/upload/game-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const { imageUrl } = await uploadRes.json();
      onUpload(imageUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="shrink-0"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
      </Button>
    </>
  );
}

function MatchConfigEditor({ config, onChange }: { config: MatchGameConfig; onChange: (config: MatchGameConfig) => void }) {
  const pairs = config.pairs || [];
  
  const addPair = () => {
    onChange({
      ...config,
      pairs: [...pairs, { id: `pair-${Date.now()}`, front: "", back: "" }]
    });
  };
  
  const updatePair = (index: number, field: 'front' | 'back', value: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange({ ...config, pairs: newPairs });
  };
  
  const removePair = (index: number) => {
    onChange({ ...config, pairs: pairs.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Card Pairs (text or image URLs)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addPair}>
          <Plus className="w-4 h-4 mr-1" /> Add Pair
        </Button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {pairs.map((pair, index) => (
          <div key={pair.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium w-8">{index + 1}.</span>
            <div className="flex gap-1 flex-1">
              <Input
                value={pair.front}
                onChange={(e) => updatePair(index, 'front', e.target.value)}
                placeholder="Front (text or URL)"
                className="flex-1"
              />
              <InlineImageUploadButton onUpload={(url) => updatePair(index, 'front', url)} />
            </div>
            <span className="text-muted-foreground">↔</span>
            <div className="flex gap-1 flex-1">
              <Input
                value={pair.back}
                onChange={(e) => updatePair(index, 'back', e.target.value)}
                placeholder="Back (text or URL)"
                className="flex-1"
              />
              <InlineImageUploadButton onUpload={(url) => updatePair(index, 'back', url)} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removePair(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      {pairs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Add pairs of matching items</p>
      )}
    </div>
  );
}

function QuizConfigEditor({ config, onChange }: { config: QuizGameConfig; onChange: (config: QuizGameConfig) => void }) {
  const questions = config.questions || [];
  
  const addQuestion = () => {
    onChange({
      ...config,
      questions: [...questions, { id: `q-${Date.now()}`, question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]
    });
  };
  
  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    onChange({ ...config, questions: newQuestions });
  };
  
  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    onChange({ ...config, questions: newQuestions });
  };
  
  const removeQuestion = (index: number) => {
    onChange({ ...config, questions: questions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Quiz Questions</Label>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="w-4 h-4 mr-1" /> Add Question
        </Button>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Question {qIndex + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
              placeholder="Enter question..."
            />
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correctIndex === optIndex}
                    onChange={() => updateQuestion(qIndex, 'correctIndex', optIndex)}
                  />
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <Input
              value={q.explanation || ""}
              onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
              placeholder="Explanation (shown after answer)"
            />
          </div>
        ))}
      </div>
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Add quiz questions</p>
      )}
    </div>
  );
}

function TimelineConfigEditor({ config, onChange }: { config: TimelineGameConfig; onChange: (config: TimelineGameConfig) => void }) {
  const events = config.events || [];
  
  const addEvent = () => {
    onChange({
      ...config,
      events: [...events, { id: `event-${Date.now()}`, title: "", description: "", image: "", order: events.length + 1 }]
    });
  };
  
  const updateEvent = (index: number, field: string, value: any) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    onChange({ ...config, events: newEvents });
  };
  
  const removeEvent = (index: number) => {
    const newEvents = events.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i + 1 }));
    onChange({ ...config, events: newEvents });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Timeline Events (in correct order)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addEvent}>
          <Plus className="w-4 h-4 mr-1" /> Add Event
        </Button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {events.map((event, index) => (
          <div key={event.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Step {index + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeEvent(index)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={event.title}
              onChange={(e) => updateEvent(index, 'title', e.target.value)}
              placeholder="Event title"
            />
            <Input
              value={event.description || ""}
              onChange={(e) => updateEvent(index, 'description', e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex gap-1">
              <Input
                value={event.image || ""}
                onChange={(e) => updateEvent(index, 'image', e.target.value)}
                placeholder="Image URL (optional)"
                className="flex-1"
              />
              <InlineImageUploadButton onUpload={(url) => updateEvent(index, 'image', url)} />
            </div>
          </div>
        ))}
      </div>
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Add events in chronological order</p>
      )}
    </div>
  );
}

function PollConfigEditor({ config, onChange }: { config: PollGameConfig; onChange: (config: PollGameConfig) => void }) {
  const questions = config.questions || [];
  
  const addQuestion = () => {
    onChange({
      ...config,
      questions: [...questions, { id: `q-${Date.now()}`, question: "", options: ["", ""] }]
    });
  };
  
  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    onChange({ ...config, questions: newQuestions });
  };
  
  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    onChange({ ...config, questions: newQuestions });
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push("");
    onChange({ ...config, questions: newQuestions });
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== optIndex);
    onChange({ ...config, questions: newQuestions });
  }
  
  const removeQuestion = (index: number) => {
    onChange({ ...config, questions: questions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Poll Questions</Label>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="w-4 h-4 mr-1" /> Add Question
        </Button>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Question {qIndex + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
              placeholder="Enter question..."
            />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Options</Label>
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                    placeholder={`Option ${optIndex + 1}`}
                    className="flex-1"
                  />
                  {q.options.length > 2 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qIndex, optIndex)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => addOption(qIndex)}>
                <Plus className="w-3 h-3 mr-1" /> Add Option
              </Button>
            </div>
          </div>
        ))}
      </div>
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Add poll questions</p>
      )}
      <div className="space-y-2">
        <Label>Completion Message</Label>
        <Input
          value={config.winMessage || ""}
          onChange={(e) => onChange({ ...config, winMessage: e.target.value })}
          placeholder="Poll Complete! Thanks for voting."
        />
      </div>
    </div>
  );
}

function FillBlankConfigEditor({ config, onChange }: { config: FillBlankGameConfig; onChange: (config: FillBlankGameConfig) => void }) {
  const blanks = config.blanks || [];

  const addBlank = () => {
    onChange({
      ...config,
      blanks: [...blanks, { id: `blank-${Date.now()}`, sentence: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]
    });
  };

  const updateBlank = (index: number, field: string, value: any) => {
    const newBlanks = [...blanks];
    newBlanks[index] = { ...newBlanks[index], [field]: value };
    onChange({ ...config, blanks: newBlanks });
  };

  const updateOption = (bIndex: number, optIndex: number, value: string) => {
    const newBlanks = [...blanks];
    newBlanks[bIndex].options[optIndex] = value;
    onChange({ ...config, blanks: newBlanks });
  };

  const removeBlank = (index: number) => {
    onChange({ ...config, blanks: blanks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Fill-in-the-Blank Sentences</Label>
        <Button type="button" variant="outline" size="sm" onClick={addBlank}>
          <Plus className="w-4 h-4 mr-1" /> Add Sentence
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Write the blank as three underscores, e.g. "Seahorses live in ___ water."</p>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {blanks.map((b, bIndex) => (
          <div key={b.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Sentence {bIndex + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeBlank(bIndex)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={b.sentence}
              onChange={(e) => updateBlank(bIndex, 'sentence', e.target.value)}
              placeholder="Seahorses live in ___ water."
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              {b.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-blank-${bIndex}`}
                    checked={b.correctIndex === optIndex}
                    onChange={() => updateBlank(bIndex, 'correctIndex', optIndex)}
                  />
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(bIndex, optIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <Input
              value={b.explanation || ""}
              onChange={(e) => updateBlank(bIndex, 'explanation', e.target.value)}
              placeholder="Explanation (shown after answer)"
            />
          </div>
        ))}
      </div>
      {blanks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Add sentences with a missing word</p>
      )}
    </div>
  );
}

function TrueFalseConfigEditor({ config, onChange }: { config: TrueFalseGameConfig; onChange: (config: TrueFalseGameConfig) => void }) {
  const statements = config.statements || [];

  const addStatement = () => {
    onChange({
      ...config,
      statements: [...statements, { id: `stmt-${Date.now()}`, statement: "", isTrue: true, explanation: "" }]
    });
  };

  const updateStatement = (index: number, field: string, value: any) => {
    const newStatements = [...statements];
    newStatements[index] = { ...newStatements[index], [field]: value };
    onChange({ ...config, statements: newStatements });
  };

  const removeStatement = (index: number) => {
    onChange({ ...config, statements: statements.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>True/False Statements</Label>
        <Button type="button" variant="outline" size="sm" onClick={addStatement}>
          <Plus className="w-4 h-4 mr-1" /> Add Statement
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Seconds per Statement</Label>
        <Input
          type="number"
          value={config.secondsPerStatement ?? 8}
          onChange={(e) => onChange({ ...config, secondsPerStatement: parseInt(e.target.value) || 8 })}
          className="w-32"
        />
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {statements.map((s, index) => (
          <div key={s.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Statement {index + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeStatement(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={s.statement}
              onChange={(e) => updateStatement(index, 'statement', e.target.value)}
              placeholder="Octopuses have three hearts."
              rows={2}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`istrue-${index}`}
                  checked={s.isTrue === true}
                  onChange={() => updateStatement(index, 'isTrue', true)}
                />
                True
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`istrue-${index}`}
                  checked={s.isTrue === false}
                  onChange={() => updateStatement(index, 'isTrue', false)}
                />
                False
              </label>
            </div>
            <Input
              value={s.explanation || ""}
              onChange={(e) => updateStatement(index, 'explanation', e.target.value)}
              placeholder="Explanation (shown after answer)"
            />
          </div>
        ))}
      </div>
      {statements.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Add true/false statements</p>
      )}
    </div>
  );
}

function PictureScrambleConfigEditor({ config, onChange }: { config: PictureScrambleGameConfig; onChange: (config: PictureScrambleGameConfig) => void }) {
  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Picture"
        value={config.imageUrl || ""}
        onChange={(url) => onChange({ ...config, imageUrl: url })}
        placeholder="https://example.com/image.jpg"
      />
      <div className="space-y-2">
        <Label>Word to Unscramble</Label>
        <Input
          value={config.word || ""}
          onChange={(e) => onChange({ ...config, word: e.target.value.toUpperCase() })}
          placeholder="SEAHORSE"
        />
      </div>
      <div className="space-y-2">
        <Label>Clue (optional hint)</Label>
        <Input
          value={config.clue || ""}
          onChange={(e) => onChange({ ...config, clue: e.target.value })}
          placeholder="This ocean animal's dads carry the babies!"
        />
      </div>
      <div className="space-y-2">
        <Label>Completion Message</Label>
        <Input
          value={config.winMessage || ""}
          onChange={(e) => onChange({ ...config, winMessage: e.target.value })}
          placeholder="You got it!"
        />
      </div>
    </div>
  );
}

function GameForm({
  game, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  game?: StoryGame; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(game?.title || "");
  const [description, setDescription] = useState(game?.description || "");
  const [thumbnail, setThumbnail] = useState(game?.thumbnail || "");
  const [funFacts, setFunFacts] = useState(game?.funFacts || "");
  const [howToPlay, setHowToPlay] = useState(game?.howToPlay || "");
  const [linkedStoryTitle, setLinkedStoryTitle] = useState(game?.linkedStoryTitle || "");
  const [pointsReward, setPointsReward] = useState(game?.pointsReward || 10);
  const [gameType, setGameType] = useState(game?.gameType || "puzzle");
  const [isActive, setIsActive] = useState(game?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(game?.isFeatured ?? false);
  const [config, setConfig] = useState<any>(game?.config || getDefaultConfig("puzzle"));
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState((game as any)?.backgroundMusicUrl || "");
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState((game as any)?.soundEffectsEnabled !== false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    game?.category
      ? (Array.isArray(game.category) ? game.category : [game.category as any])
      : ["Science"]
  );

  function getDefaultConfig(type: string): any {
    switch (type) {
      case "puzzle":
        return { imageUrl: "", gridSize: 3, hintText: "", winMessage: "Puzzle Complete!" };
      case "whack":
        return { targetImage: "", targetLabel: "", distractorImages: [], distractorLabels: [], duration: 30, winMessage: "Time's Up!" };
      case "match":
        return { pairs: [], winMessage: "All Matched!" };
      case "quiz":
        return { questions: [], passingScore: 60, winMessage: "Great Job!" };
      case "timeline":
        return { events: [], winMessage: "Perfect Order!" };
      case "poll":
        return { questions: [], winMessage: "Poll Complete! Thanks for voting." };
      case "fillblank":
        return { blanks: [], winMessage: "Great reading!" };
      case "truefalse":
        return { statements: [], secondsPerStatement: 8, winMessage: "Speedy work!" };
      case "scramble":
        return { imageUrl: "", word: "", clue: "", winMessage: "You got it!" };
      default:
        return {};
    }
  }

  const handleGameTypeChange = (newType: string) => {
    setGameType(newType);
    setConfig(getDefaultConfig(newType));
  };

  useEffect(() => {
    if (game) {
      setBackgroundMusicUrl((game as any)?.backgroundMusicUrl || "");
      setSoundEffectsEnabled((game as any)?.soundEffectsEnabled !== false);
    }
  }, [game]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      title,
      description,
      thumbnail,
      funFacts,
      howToPlay,
      pointsReward: Number.isFinite(pointsReward) ? pointsReward : 10,
      gameType,
      isActive,
      isFeatured,
      config,
      soundEffectsEnabled,
      category: selectedCategories,
    };
    if (linkedStoryTitle) payload.linkedStoryTitle = linkedStoryTitle;
    if (backgroundMusicUrl) payload.backgroundMusicUrl = backgroundMusicUrl;
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="game">Game Config</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Game Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Fun Science Quiz"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Game Type</Label>
              <Select value={gameType} onValueChange={handleGameTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A fun game about..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="Thumbnail"
              value={thumbnail}
              onChange={setThumbnail}
              placeholder="https://..."
            />
            <div className="space-y-2">
              <Label>Points Reward</Label>
              <Input
                type="number"
                value={pointsReward}
                onChange={(e) => setPointsReward(parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Linked Story Title (for story connection)</Label>
            <Input
              value={linkedStoryTitle}
              onChange={(e) => setLinkedStoryTitle(e.target.value)}
              placeholder="Enter the exact story title to link this game"
            />
            <p className="text-xs text-muted-foreground">Leave empty if not linked to a specific story</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Category</Label>
              <Select 
                value={selectedCategories[0]} 
                onValueChange={(val) => {
                  const newCats = [...selectedCategories];
                  newCats[0] = val;
                  setSelectedCategories(newCats);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Secondary Category (Optional)</Label>
              <Select 
                value={selectedCategories[1] || "none"} 
                onValueChange={(val) => {
                  if (val === "none") {
                    setSelectedCategories([selectedCategories[0]]);
                  } else {
                    const newCats = [...selectedCategories];
                    newCats[1] = val;
                    setSelectedCategories(newCats);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select second category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORIES.filter(c => c !== selectedCategories[0]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="active" className="flex items-center gap-1">
                {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {isActive ? "Active" : "Inactive"}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label htmlFor="featured" className="flex items-center gap-1">
                {isFeatured ? "Featured" : "Not Featured"}
              </Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Fun Facts (shown on game preview)</Label>
            <Textarea
              value={funFacts}
              onChange={(e) => setFunFacts(e.target.value)}
              placeholder="Did you know? Share interesting facts here..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>How to Play</Label>
            <Textarea
              value={howToPlay}
              onChange={(e) => setHowToPlay(e.target.value)}
              placeholder="Instructions for playing the game..."
              rows={4}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-heading font-semibold mb-4">Audio Settings</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Background Music URL (optional)</Label>
                <Input
                  value={backgroundMusicUrl}
                  onChange={(e) => setBackgroundMusicUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                />
                <p className="text-xs text-muted-foreground">URL to background music file (MP3). Leave empty for no music.</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="sfx" checked={soundEffectsEnabled} onCheckedChange={setSoundEffectsEnabled} />
                <Label htmlFor="sfx">Enable Sound Effects</Label>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="game" className="pt-4">
          {gameType === "puzzle" && (
            <PuzzleConfigEditor config={config as PuzzleGameConfig} onChange={setConfig} />
          )}
          {gameType === "whack" && (
            <WhackConfigEditor config={config as WhackGameConfig} onChange={setConfig} />
          )}
          {gameType === "match" && (
            <MatchConfigEditor config={config as MatchGameConfig} onChange={setConfig} />
          )}
          {gameType === "quiz" && (
            <QuizConfigEditor config={config as QuizGameConfig} onChange={setConfig} />
          )}
          {gameType === "timeline" && (
            <TimelineConfigEditor config={config as TimelineGameConfig} onChange={setConfig} />
          )}
          {gameType === "poll" && (
            <PollConfigEditor config={config as PollGameConfig} onChange={setConfig} />
          )}
          {gameType === "fillblank" && (
            <FillBlankConfigEditor config={config as FillBlankGameConfig} onChange={setConfig} />
          )}
          {gameType === "truefalse" && (
            <TrueFalseConfigEditor config={config as TrueFalseGameConfig} onChange={setConfig} />
          )}
          {gameType === "scramble" && (
            <PictureScrambleConfigEditor config={config as PictureScrambleGameConfig} onChange={setConfig} />
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" /> {isLoading ? "Saving..." : "Save Game"}
        </Button>
      </div>
    </form>
  );
}

function GameRow({ game, onEdit, onDelete }: { game: StoryGame; onEdit: () => void; onDelete: () => void }) {
  const gameType = GAME_TYPES.find(t => t.value === game.gameType);
  
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b hover:bg-muted/50"
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {game.thumbnail ? (
            <img src={game.thumbnail} alt={game.title} className="w-12 h-12 object-cover rounded-lg" />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
              {gameType?.icon || "🎮"}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">{game.title}</p>
            <p className="text-xs text-muted-foreground">{game.linkedStoryTitle || "No linked story"}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
          {gameType?.icon} {gameType?.label || game.gameType}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className="font-medium text-primary">{game.pointsReward} pts</span>
      </td>
      <td className="py-4 px-4">
        {game.isActive ? (
          <span className="flex items-center gap-1 text-green-600 text-xs">
            <Eye className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <EyeOff className="w-3 h-3" /> Inactive
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function AdminGames() {
  const [editingGame, setEditingGame] = useState<StoryGame | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isSessionValid, isLoading: isCheckingSession } = useQuery({
    queryKey: ["adminSession"],
    queryFn: validateSession,
    retry: false,
    staleTime: 0
  });

  const isAuthenticated = !!isSessionValid;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const { data: games = [], isLoading, error } = useQuery<StoryGame[]>({
    queryKey: ["/api/admin/games"],
    queryFn: async () => {
      const res = await fetch("/api/admin/games", { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        let message = "";
        try {
          const raw = await res.text();
          try {
            const parsed = JSON.parse(raw);
            message = parsed.message || raw;
          } catch {
            message = raw || res.statusText;
          }
        } catch {
          message = res.statusText || "Unknown error";
        }
        throw new Error(`HTTP ${res.status}: ${message}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setIsCreating(false);
      toast({ title: "Game created successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = "";
        try {
          const raw = await res.text();
          try {
            const parsed = JSON.parse(raw);
            message = parsed.message || raw;
          } catch {
            message = raw || res.statusText;
          }
        } catch {
          message = res.statusText || "Unknown error";
        }
        throw new Error(`HTTP ${res.status}: ${message}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setEditingGame(null);
      toast({ title: "Game updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete game");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Game deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete game", variant: "destructive" });
    },
  });

  const handleDelete = (game: StoryGame) => {
    if (window.confirm(`Are you sure you want to delete "${game.title}"?`)) {
      deleteMutation.mutate(game.id);
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.linkedStoryTitle?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || game.gameType === filterType;
    return matchesSearch && matchesType;
  });

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showPasswordLogin) {
      return <AdminLoginDialog onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["adminSession"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/games"] });
        setShowPasswordLogin(false);
      }} />;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6">Enter the admin password to access the game management panel.</p>
          <Button className="w-full mb-4" onClick={() => setShowPasswordLogin(true)}>
            Use Admin Password
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full">Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    if (error.message === "Unauthorized") {
      return <AdminLoginDialog onSuccess={() => {
        // Small delay to ensure cookie is processed
        queryClient.invalidateQueries({ queryKey: ["adminSession"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/games"] });
      }} />;
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-6">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
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
            <Link href="/admin/stories" className="hover:text-primary transition-colors">Admin: Stories</Link>
            <Link href="/admin/videos" className="hover:text-primary transition-colors">Admin: Videos</Link>
            <span className="text-primary">Admin: Games</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-2">
                <Gamepad2 className="w-8 h-8" /> Game Management
              </h1>
              <p className="text-muted-foreground text-sm">
                Create and manage mini-games for WhyPals stories
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Game
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {GAME_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-heading">Loading games...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl">
            <p className="text-muted-foreground font-heading text-lg mb-4">
              {games.length === 0 ? "No games yet" : "No games match your search"}
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create your first game
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-heading text-sm">Game</th>
                  <th className="text-left py-3 px-4 font-heading text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-heading text-sm">Points</th>
                  <th className="text-left py-3 px-4 font-heading text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-heading text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => (
                  <GameRow
                    key={game.id}
                    game={game}
                    onEdit={() => setEditingGame(game)}
                    onDelete={() => handleDelete(game)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Create New Game</DialogTitle>
            </DialogHeader>
            <GameForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setIsCreating(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Edit Game</DialogTitle>
            </DialogHeader>
            {editingGame && (
              <GameForm
                game={editingGame}
                onSave={(data) => updateMutation.mutate({ id: editingGame.id, data })}
                onCancel={() => setEditingGame(null)}
                isLoading={updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

      <footer className="bg-white border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/50">
            Admin Panel - WhyPals for Kids
          </p>
        </div>
      </footer>
    </div>
  );
}
