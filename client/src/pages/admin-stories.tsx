import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Edit, Trash2, Eye, EyeOff, Star, ArrowLeft, Save, X, Upload, Loader2, Lock, Shield, Volume2, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { AutoPublishToggle } from "@/components/AutoPublishToggle";
import logo from "@assets/whypals-logo.png";
import { CATEGORIES as ALL_CATEGORIES } from "@/lib/data";
import type { Story, InsertStory } from "@shared/schema";

const CATEGORIES = ALL_CATEGORIES.map(c => c.id);

// Regex for matching image tags (Must match story.tsx logic)
const IMAGE_TAG_REGEX = /\[IMAGE:([^\]|]+)(?:\|([^\]]*))?\]/g;
const FULL_IMAGE_TAG_REGEX = /^\[IMAGE:([^\]|]+)(?:\|([^\]]*))?\]$/;

function isImageParagraph(text: string): boolean {
  return FULL_IMAGE_TAG_REGEX.test(text.trim());
}

function removeImageTags(text: string): string {
  return text.replace(IMAGE_TAG_REGEX, '').trim();
}

function AudioGenerator({ content }: { content: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!content) return;
    
    // 1. Confirm with user
    if (!confirm("This will generate audio for all paragraphs using your API credits. Are you sure?")) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus("Analyzing content...");
    
    // 2. Split and filter content (Exact same logic as story.tsx)
    const rawParagraphs = content.split('\n\n');
    const textParagraphs: string[] = [];
    
    rawParagraphs.forEach((p) => {
      if (!isImageParagraph(p)) {
        const cleaned = removeImageTags(p);
        if (cleaned.length > 0) {
          textParagraphs.push(cleaned);
        }
      }
    });

    if (textParagraphs.length === 0) {
      setError("No valid text paragraphs found to generate audio for.");
      setIsGenerating(false);
      return;
    }

    setProgress({ current: 0, total: textParagraphs.length });

    // 3. Process each paragraph
    for (let i = 0; i < textParagraphs.length; i++) {
      const text = textParagraphs[i];
      setStatus(`Generating audio for paragraph ${i + 1} of ${textParagraphs.length}...`);
      
      try {
        const res = await fetch("/api/admin/generate-audio", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text }),
          credentials: "include"
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Unknown error");
        }
        
      } catch (err: any) {
        console.error(err);
        setError(`Failed on paragraph ${i + 1}: ${err.message}`);
        setIsGenerating(false);
        return;
      }
      
      setProgress({ current: i + 1, total: textParagraphs.length });
    }

    setStatus("Audio generation complete! All paragraphs are now cached.");
    setIsGenerating(false);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-purple-600" />
          <h3 className="font-heading font-semibold text-slate-900">Audio Generation</h3>
        </div>
        {!isGenerating && !progress && (
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleGenerate}
            className="bg-purple-100 text-purple-700 hover:bg-purple-200"
          >
            Generate Audio (Manual Cost)
          </Button>
        )}
      </div>
      
      <p className="text-sm text-slate-500 mb-4">
        This will generate and cache audio for each paragraph using ElevenLabs/OpenAI. 
        Only perform this once per story version to save credits.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {(isGenerating || progress) && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-600">
            <span>{status}</span>
            {progress && <span>{Math.round((progress.current / progress.total) * 100)}%</span>}
          </div>
          {progress && (
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
          )}
          {progress && progress.current === progress.total && !isGenerating && (
            <div className="flex items-center gap-2 text-green-600 text-sm mt-2 font-medium">
              <CheckCircle className="w-4 h-4" />
              Generation Complete
            </div>
          )}
        </div>
      )}
    </div>
  );
}


async function validateSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", { credentials: "include" });
    if (res.ok) {
      return true;
    }
  } catch {}
  return false;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
        await res.json();
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

function StoryForm({ 
  story, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  story?: Story; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(story?.title || "");
  const [slug, setSlug] = useState(story?.slug || "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState(story?.excerpt || "");
  const [content, setContent] = useState(story?.content || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    story?.category 
      ? (Array.isArray(story.category) ? story.category : [story.category]) 
      : ["Science"]
  );
  const [thumbnail, setThumbnail] = useState(story?.thumbnail || "");
  const [thumbnailCredit, setThumbnailCredit] = useState((story as any)?.thumbnailCredit || "");
  const [readTime, setReadTime] = useState(story?.readTime || "3 min read");
  const [isFeatured, setIsFeatured] = useState(story?.isFeatured || false);
  const [isPublished, setIsPublished] = useState(story?.isPublished || false);
  const [isUploading, setIsUploading] = useState(false);
  const [isContentImageUploading, setIsContentImageUploading] = useState(false);
  const [contentImageCredit, setContentImageCredit] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!story && !slugEdited) {
      setSlug(generateSlug(newTitle));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugEdited(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be smaller than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/admin/upload/image', {
        method: 'POST',
        body: formData,
        credentials: "include"
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const { imageUrl } = await uploadRes.json();
      setThumbnail(imageUrl);
      toast({ title: "Image uploaded successfully!" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleContentImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be smaller than 5MB", variant: "destructive" });
      return;
    }

    setIsContentImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/admin/upload/story-content-image', {
        method: 'POST',
        body: formData,
        credentials: "include"
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const { imageUrl } = await uploadRes.json();
      setPendingImageUrl(imageUrl);
      setContentImageCredit("");
      toast({ title: "Image uploaded! Add optional credit below." });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setIsContentImageUploading(false);
      if (contentImageInputRef.current) {
        contentImageInputRef.current.value = '';
      }
    }
  };

  const insertImageWithCredit = () => {
    if (!pendingImageUrl) return;
    
    const imageTag = contentImageCredit 
      ? `[IMAGE:${pendingImageUrl}|${contentImageCredit}]`
      : `[IMAGE:${pendingImageUrl}]`;
    
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + imageTag + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + imageTag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setContent(content + `\n${imageTag}\n`);
    }
    
    setPendingImageUrl(null);
    setContentImageCredit("");
    toast({ title: "Image inserted!" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      slug,
      excerpt,
      content,
      category: selectedCategories,
      thumbnail,
      thumbnailCredit: thumbnailCredit || null,
      readTime,
      isFeatured,
      isPublished,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input 
            id="title"
            value={title} 
            onChange={handleTitleChange}
            placeholder="Enter story title"
            required
            data-testid="input-story-title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL path)</Label>
          <Input 
            id="slug"
            value={slug} 
            onChange={handleSlugChange}
            placeholder="story-url-slug"
            required
            data-testid="input-story-slug"
          />
          <p className="text-xs text-muted-foreground">Auto-generated from title. Edit to customize.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea 
          id="excerpt"
          value={excerpt} 
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary of the story..."
          rows={2}
          required
          data-testid="input-story-excerpt"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Content</Label>
          <div className="flex items-center gap-2">
            <input
              ref={contentImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleContentImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => contentImageInputRef.current?.click()}
              disabled={isContentImageUploading}
            >
              {isContentImageUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Insert Image
            </Button>
          </div>
        </div>
        <Textarea 
          id="content"
          ref={contentTextareaRef}
          value={content} 
          onChange={(e) => setContent(e.target.value)}
          placeholder="Full story content... Use [IMAGE:url] to insert inline images."
          rows={10}
          required
          data-testid="input-story-content"
        />
        <p className="text-xs text-muted-foreground">Click cursor position, then "Insert Image" to add inline images. Format: [IMAGE:url] or [IMAGE:url|credit]</p>
        
        {pendingImageUrl && (
          <div className="mt-3 p-4 bg-muted rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <img src={pendingImageUrl} alt="Pending" className="w-20 h-14 object-cover rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium">Image uploaded</p>
                <p className="text-xs text-muted-foreground">Add optional credit before inserting</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentImageCredit" className="text-sm">Image Credit (optional)</Label>
              <Input 
                id="contentImageCredit"
                value={contentImageCredit} 
                onChange={(e) => setContentImageCredit(e.target.value)}
                placeholder="e.g. Photo: CC Alex Abrams"
                data-testid="input-content-image-credit"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="button" size="sm" onClick={insertImageWithCredit}>
                Insert Image
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPendingImageUrl(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <AudioGenerator content={content} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-4">
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
        <div className="space-y-2">
          <Label htmlFor="thumbnail">Thumbnail Image</Label>
          <div className="flex gap-2">
            <Input 
              id="thumbnail"
              value={thumbnail} 
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://... or upload an image"
              required
              className="flex-1"
              data-testid="input-story-thumbnail"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file-thumbnail"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-thumbnail"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>
          {thumbnail && (
            <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border">
              <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="thumbnailCredit">Hero Image Credit (optional)</Label>
          <Input 
            id="thumbnailCredit"
            value={thumbnailCredit} 
            onChange={(e) => setThumbnailCredit(e.target.value)}
            placeholder="e.g. Photo: CC Alex Abrams"
            data-testid="input-story-thumbnail-credit"
          />
          <p className="text-xs text-muted-foreground">Displays next to the date on the story page</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="readTime">Read Time</Label>
          <Input 
            id="readTime"
            value={readTime} 
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="3 min read"
            required
            data-testid="input-story-readtime"
          />
        </div>
      </div>

      <div className="flex items-center gap-8 pt-4">
        <div className="flex items-center gap-2">
          <Switch 
            id="featured" 
            checked={isFeatured} 
            onCheckedChange={setIsFeatured}
            data-testid="switch-story-featured"
          />
          <Label htmlFor="featured" className="flex items-center gap-1">
            <Star className="w-4 h-4" /> Featured
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            id="published" 
            checked={isPublished} 
            onCheckedChange={setIsPublished}
            data-testid="switch-story-published"
          />
          <Label htmlFor="published" className="flex items-center gap-1">
            {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isPublished ? "Published" : "Draft"}
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-story">
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={isLoading} data-testid="button-save-story">
          <Save className="w-4 h-4 mr-2" /> {isLoading ? "Saving..." : "Save Story"}
        </Button>
      </div>
    </form>
  );
}

function StoryRow({ story, views, reads, onEdit, onDelete }: { story: Story; views: number; reads: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b hover:bg-muted/50"
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {story.thumbnail && (
            <img 
              src={story.thumbnail} 
              alt={story.title}
              className="w-16 h-10 object-cover rounded"
            />
          )}
          <div>
            <p className="font-semibold text-sm">{story.title}</p>
            <p className="text-xs text-muted-foreground">{story.slug}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex gap-1 flex-wrap">
          {(Array.isArray(story.category) ? story.category : [story.category]).map((cat: string) => (
            <span key={cat} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      </td>
      <td className="py-4 px-4">
        {story.isFeatured ? (
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        ) : (
          <Star className="w-4 h-4 text-muted-foreground/30" />
        )}
      </td>
      <td className="py-4 px-4">
        {story.isPublished ? (
          <span className="flex items-center gap-1 text-green-600 text-xs">
            <Eye className="w-3 h-3" /> Published
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <EyeOff className="w-3 h-3" /> Draft
          </span>
        )}
      </td>
      <td className="py-4 px-4">
        <span className="text-sm font-medium">{story.views || 0}</span>
      </td>
      <td className="py-4 px-4 text-right">
        <span className="text-sm font-medium">{views}</span>
      </td>
      <td className="py-4 px-4 text-right">
        <span className="text-sm font-medium">{reads}</span>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit} data-testid={`button-edit-story-${story.id}`}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700" data-testid={`button-delete-story-${story.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function AdminStories() {
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isSessionValid, isLoading: isCheckingSession } = useQuery({
    queryKey: ["adminSession"],
    queryFn: validateSession,
    retry: false,
    staleTime: 0
  });

  const isAuthenticated = !!isSessionValid;

  const headers = {
    "Content-Type": "application/json",
  };

  const { data: stories = [], isLoading, error } = useQuery<Story[]>({
    queryKey: ["/api/admin/stories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stories", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch stories");
      }
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: storyStats = [] } = useQuery<{ storyId: number; views: number; reads: number }[]>({
    queryKey: ["/api/admin/story-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/story-stats", {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: isAuthenticated,
  });
  
  const statsMap = useMemo(() => {
    const m = new Map<number, { views: number; reads: number }>();
    for (const s of storyStats) {
      m.set(s.storyId, { views: s.views, reads: s.reads });
    }
    return m;
  }, [storyStats]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertStory) => {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
      setIsCreating(false);
      toast({ title: "Story created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating story", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertStory }) => {
      const res = await fetch(`/api/admin/stories/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
      setEditingStory(null);
      toast({ title: "Story updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating story", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = async (story: Story) => {
    if (!confirm("Are you sure you want to delete this story?")) return;
    try {
      const res = await fetch(`/api/admin/stories/${story.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete story");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
      toast({ title: "Story deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error deleting story", description: error.message, variant: "destructive" });
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginDialog onSuccess={() => {
      queryClient.invalidateQueries({ queryKey: ["adminSession"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
    }} />;
  }

  if (error) {
    if (error.message === "Unauthorized") {
      return <AdminLoginDialog onSuccess={() => {
        queryClient.resetQueries({ queryKey: ["/api/admin/stories"] });
        queryClient.invalidateQueries({ queryKey: ["adminSession"] });
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
            <span className="text-primary">Admin: Stories</span>
            <Link href="/admin/videos" className="hover:text-primary transition-colors">Admin: Videos</Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                Story Management
              </h1>
              <p className="text-muted-foreground text-sm">
                Create, edit, and publish stories for WhyPals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AutoPublishToggle />
            <Button onClick={() => setIsCreating(true)} data-testid="button-create-story">
              <Plus className="w-4 h-4 mr-2" /> New Story
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-heading">Loading stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl">
            <p className="text-muted-foreground font-heading text-lg mb-4">No stories yet</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create your first story
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-heading text-sm">Story</th>
                  <th className="text-left py-3 px-4 font-heading text-sm">Category</th>
                  <th className="text-left py-3 px-4 font-heading text-sm">Featured</th>
                  <th className="text-left py-3 px-4 font-heading text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-heading text-sm">Views</th>
                  <th className="text-right py-3 px-4 font-heading text-sm">Read Aloud</th>
                  <th className="text-right py-3 px-4 font-heading text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    views={statsMap.get(story.id)?.views ?? 0}
                    reads={statsMap.get(story.id)?.reads ?? 0}
                    onEdit={() => setEditingStory(story)}
                    onDelete={() => handleDelete(story)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Create New Story</DialogTitle>
            </DialogHeader>
            <StoryForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setIsCreating(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingStory} onOpenChange={(open) => !open && setEditingStory(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Edit Story</DialogTitle>
            </DialogHeader>
            {editingStory && (
              <StoryForm
                story={editingStory}
                onSave={(data) => updateMutation.mutate({ id: editingStory.id, data })}
                onCancel={() => setEditingStory(null)}
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
