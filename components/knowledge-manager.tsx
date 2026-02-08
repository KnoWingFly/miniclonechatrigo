"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Book } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ================== Types ==================
type KnowledgeCategory = "product_info" | "business_rules" | "instructions";
interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
interface Props {
  open: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
}

// ================== Main Component  ==================
export function KnowledgeManager({ open, onClose, botId, botName }: Props) {
  const [activeCategory, setActiveCategory] =
    useState<KnowledgeCategory>("product_info");
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  // Fetch knowledge on mount and category change
  useEffect(() => {
    if (open) {
      fetchKnowledge();
    }
  }, [open, activeCategory]);
  async function fetchKnowledge() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/knowledge?botId=${botId}&category=${activeCategory}`,
      );
      const data = await response.json();
      if (data.success) {
        setKnowledge(data.data);
      } else {
        toast.error("Failed to load knowledge");
      }
    } catch (error) {
      console.error("Error fetching knowledge:", error);
      toast.error("Failed to load knowledge");
    } finally {
      setLoading(false);
    }
  }
  // Create or update knowledge
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validation
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      setLoading(true);
      if (editingId) {
        // Update existing entry
        const response = await fetch("/api/knowledge", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            botId,
            title: formData.title,
            content: formData.content,
          }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success("Knowledge updated! Embedding regenerated.");
          setEditingId(null);
          resetForm();
          fetchKnowledge();
        } else {
          toast.error(data.error || "Failed to update");
        }
      } else {
        // Create new entry
        const response = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId,
            category: activeCategory,
            title: formData.title,
            content: formData.content,
          }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success("Knowledge added! Embedding generated.");
          resetForm();
          fetchKnowledge();
        } else {
          toast.error(data.error || "Failed to add");
        }
      }
    } catch (error) {
      console.error("Error saving knowledge:", error);
      toast.error("Failed to save knowledge");
    } finally {
      setLoading(false);
    }
  }
  // Delete knowledge
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge?id=${id}&botId=${botId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Knowledge deleted");
        fetchKnowledge();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting knowledge:", error);
      toast.error("Failed to delete knowledge");
    } finally {
      setLoading(false);
    }
  }
  // Edit knowledge (populate form)
  function handleEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setFormData({
      title: entry.title,
      content: entry.content,
    });
  }
  // Reset form
  function resetForm() {
    setFormData({ title: "", content: "" });
    setEditingId(null);
  }
  // Category labels
  const categoryLabels = {
    product_info: "Product Info",
    business_rules: "Business Rules",
    instructions: "Instructions",
  };
  // Render
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Knowledge Base</DialogTitle>
          <DialogDescription>
            Add, edit, or delete knowledge that the AI bot can reference.
            Embeddings are automatically generated for semantic search.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={activeCategory}
          onValueChange={(v) => setActiveCategory(v as KnowledgeCategory)}
        >
          {/* Category tabs */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product_info">Product Info</TabsTrigger>
            <TabsTrigger value="business_rules">Business Rules</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>
          {/* Tab content */}
          {(
            [
              "product_info",
              "business_rules",
              "instructions",
            ] as KnowledgeCategory[]
          ).map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              {/* Add/edit form */}
              <Card className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-medium">
                    {editingId ? "Edit Entry" : "Add New Entry"}
                  </h3>
                  <Input
                    placeholder="Title (e.g., Premium Plan Features)"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    disabled={loading}
                  />
                  <Textarea
                    placeholder="Content (e.g., Our premium plan includes unlimited chats, priority support...)"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={4}
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingId ? "Updating..." : "Adding..."}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {editingId ? "Update" : "Add"}
                        </>
                      )}
                    </Button>
                    {editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>
              {/* Existing entries list */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Existing Entries ({knowledge.length})
                </h3>
                {loading && knowledge.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : knowledge.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No entries yet. Add one above!
                  </div>
                ) : (
                  knowledge.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {entry.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {entry.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated:{" "}
                            {new Date(entry.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(entry)}
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(entry.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}