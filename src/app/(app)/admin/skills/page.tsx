"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Pencil, Trash2, Brain, Link2 } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  domain: string;
  gradeMin: number;
  gradeMax: number;
  prerequisites: string[];
  description: string;
}

export default function AdminSkillsPage() {
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState({ name: "", domain: "", gradeMin: 0, gradeMax: 2, prerequisites: "", description: "" });

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await apiRequest("/api/admin/skills");
      setSkills(data.skills || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingSkill(null);
    setForm({ name: "", domain: "", gradeMin: 0, gradeMax: 2, prerequisites: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({
      name: skill.name,
      domain: skill.domain,
      gradeMin: skill.gradeMin,
      gradeMax: skill.gradeMax,
      prerequisites: skill.prerequisites.join(", "),
      description: skill.description,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      domain: form.domain,
      gradeMin: Number(form.gradeMin),
      gradeMax: Number(form.gradeMax),
      prerequisites: form.prerequisites ? form.prerequisites.split(",").map((s) => s.trim()) : [],
      description: form.description,
    };

    try {
      if (editingSkill) {
        await apiRequest(`/api/admin/skills/${editingSkill.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSkills((prev) => prev.map((s) => (s.id === editingSkill.id ? { ...s, ...payload } : s)));
        toast("success", "Skill updated");
      } else {
        const data = await apiRequest("/api/admin/skills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSkills((prev) => [...prev, data.skill]);
        toast("success", "Skill created");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast("error", err.message || "Failed to save");
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!confirm(`Delete "${skill.name}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/admin/skills/${skill.id}`, { method: "DELETE" });
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      toast("success", "Skill deleted");
    } catch (err: any) {
      toast("error", err.message || "Failed to delete");
    }
  };

  const filteredSkills = skills.filter((s) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase());
    const matchesTab = selectedTab === "all" ||
      (selectedTab === "K-2" && s.gradeMax <= 2) ||
      (selectedTab === "3-5" && s.gradeMin >= 3 && s.gradeMax <= 5) ||
      (selectedTab === "6-8" && s.gradeMin >= 6 && s.gradeMax <= 8) ||
      (selectedTab === "9-12" && s.gradeMin >= 9);
    return matchesSearch && matchesTab;
  });

  const domains = [...new Set(skills.map((s) => s.domain))].sort();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skill Map</h1>
          <p className="text-sm text-gray-500">{skills.length} skills across {domains.length} domains</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search skills or domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="K-2">K-2</TabsTrigger>
            <TabsTrigger value="3-5">3-5</TabsTrigger>
            <TabsTrigger value="6-8">6-8</TabsTrigger>
            <TabsTrigger value="9-12">9-12</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSkills.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No skills found. {search ? "Try a different search." : "Add your first skill."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 stagger-children">
          {filteredSkills.map((skill) => (
            <Card key={skill.id} className="group hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4 text-indigo-500 shrink-0" />
                      <h3 className="font-medium text-gray-900 truncate">{skill.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{skill.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Badge variant="outline" className="text-xs">{skill.domain}</Badge>
                      <span>Grades {skill.gradeMin}–{skill.gradeMax}</span>
                      {skill.prerequisites.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Link2 className="h-3 w-3" />
                          {skill.prerequisites.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(skill)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(skill)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Edit Skill" : "Add New Skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Skill Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Fractions" />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="e.g., Number Sense" list="domains" />
              <datalist id="domains">
                {domains.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade Min</Label>
                <Input type="number" min={0} max={12} value={form.gradeMin} onChange={(e) => setForm({ ...form, gradeMin: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Grade Max</Label>
                <Input type="number" min={0} max={12} value={form.gradeMax} onChange={(e) => setForm({ ...form, gradeMax: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prerequisites (comma-separated IDs)</Label>
              <Input value={form.prerequisites} onChange={(e) => setForm({ ...form, prerequisites: e.target.value })} placeholder="e.g., 1, 2, 3" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this skill cover?" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || !form.domain} className="flex-1">
                {editingSkill ? "Save Changes" : "Create Skill"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
