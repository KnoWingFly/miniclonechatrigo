"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Brain, TrendingUp } from "lucide-react";
import { toast } from "sonner";

// ================== Types ==================
interface UserPreference {
  id: string;
  preference: string;
  source: "explicit" | "pattern_analysis";
  confidence: number;
  createdAt: string;
}
interface PreferencesData {
  all: UserPreference[];
  bySource: {
    explicit: UserPreference[];
    pattern_analysis: UserPreference[];
  };
  stats: {
    total: number;
    explicit: number;
    inferred: number;
    avgConfidence: number;
  };
}
interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
}

// ================== Main Component ==================
export function PreferencesViewer({ open, onClose, userId }: Props) {
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [loading, setLoading] = useState(false);
  // Fetch preferences when modal opens
  useEffect(() => {
    if (open && userId) {
      fetchPreferences();
    }
  }, [open, userId]);
  async function fetchPreferences() {
    try {
      setLoading(true);
      const response = await fetch(`/api/preferences/${userId}`);
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data);
      } else {
        toast.error("Failed to load preferences");
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }
  // Confidence badge color
  function getConfidenceBadge(confidence: number) {
    if (confidence >= 0.9) {
      return (
        <Badge className="bg-green-500">
          Very High ({(confidence * 100).toFixed(0)}%)
        </Badge>
      );
    } else if (confidence >= 0.7) {
      return (
        <Badge className="bg-blue-500">
          High ({(confidence * 100).toFixed(0)}%)
        </Badge>
      );
    } else if (confidence >= 0.5) {
      return (
        <Badge className="bg-yellow-500">
          Medium ({(confidence * 100).toFixed(0)}%)
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">Low ({(confidence * 100).toFixed(0)}%)</Badge>
      );
    }
  }
  // Render
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Learned Preferences</DialogTitle>
          <DialogDescription>
            These preferences are automatically learned from your conversations.
            The bot uses them to personalize responses.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading preferences...</p>
          </div>
        ) : !preferences || preferences.all.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No preferences learned yet</h3>
            <p className="text-sm text-muted-foreground">
              Start chatting and the bot will learn your preferences!
              <br />
              Try saying things like "I prefer detailed explanations" or "I like
              brief answers"
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Summary */}
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {preferences.stats.total}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Preferences
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {preferences.stats.explicit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Explicitly Stated
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(preferences.stats.avgConfidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avg Confidence
                  </p>
                </div>
              </div>
            </Card>
            {/* Explicit Preferences */}
            {preferences.bySource.explicit.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium">
                    Explicitly Stated ({preferences.bySource.explicit.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {preferences.bySource.explicit.map((pref) => (
                    <Card key={pref.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="flex-1">{pref.preference}</p>
                        {getConfidenceBadge(pref.confidence)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Learned on{" "}
                        {new Date(pref.createdAt).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {/* Pattern-inferred Preferences */}
            {preferences.bySource.pattern_analysis.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium">
                    Inferred from Patterns (
                    {preferences.bySource.pattern_analysis.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {preferences.bySource.pattern_analysis.map((pref) => (
                    <Card key={pref.id} className="p-4 border-dashed">
                      <div className="flex items-start justify-between gap-4">
                        <p className="flex-1 text-muted-foreground italic">
                          {pref.preference}
                        </p>
                        {getConfidenceBadge(pref.confidence)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Learned on{" "}
                        {new Date(pref.createdAt).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
