"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Building2, Users, Plus, UserPlus, Mail, Shield } from "lucide-react";

export default function OrgPage() {
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", type: "family" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    try {
      const data = await apiRequest("/api/organizations");
      setOrgs(data.organizations || []);
      if (data.organizations?.length > 0) {
        selectOrg(data.organizations[0]);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const selectOrg = async (org: any) => {
    setSelectedOrg(org);
    try {
      const data = await apiRequest(`/api/organizations/${org.id}/members`);
      setMembers(data.members || []);
    } catch {}
  };

  const handleCreate = async () => {
    try {
      const data = await apiRequest("/api/organizations", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setOrgs((prev) => [...prev, data.organization]);
      selectOrg(data.organization);
      setCreateOpen(false);
      toast("success", "Organization created");
    } catch (err: any) {
      toast("error", err.message);
    }
  };

  const handleInvite = async () => {
    if (!selectedOrg || !inviteEmail) return;
    try {
      await apiRequest(`/api/organizations/${selectedOrg.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      toast("success", `Invited ${inviteEmail}`);
      setInviteEmail("");
      setInviteOpen(false);
      selectOrg(selectedOrg);
    } catch (err: any) {
      toast("error", err.message);
    }
  };

  const ORG_TYPES = [
    { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
    { value: "school", label: "School", icon: "🏫" },
    { value: "nonprofit", label: "Nonprofit", icon: "💚" },
    { value: "church", label: "Church", icon: "⛪" },
    { value: "community", label: "Community Org", icon: "🏘️" },
    { value: "afterschool", label: "After-School Program", icon: "🎒" },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500">Manage your teams, families, and groups</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Org List */}
        <div className="space-y-3">
          {orgs.map((org) => (
            <Card
              key={org.id}
              className={`cursor-pointer transition-all ${selectedOrg?.id === org.id ? "ring-2 ring-indigo-500" : "hover:shadow-sm"}`}
              onClick={() => selectOrg(org)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{org.name}</p>
                    <p className="text-xs text-gray-500">{org.type} • {org.memberCount || 0} members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {orgs.length === 0 && !loading && (
            <Card className="text-center py-8">
              <CardContent>
                <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No organizations yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Org Detail */}
        <div className="md:col-span-2">
          {selectedOrg ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedOrg.name}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                </div>
                <Badge variant="outline" className="w-fit">{selectedOrg.type}</Badge>
              </CardHeader>
              <CardContent>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members ({members.length})
                </h3>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
                          {member.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center py-16">
              <CardContent className="text-center">
                <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">Select an organization to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g., Smith Family, Lincoln Middle School" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {ORG_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setCreateForm({ ...createForm, type: t.value })}
                    className={`p-3 rounded-lg border-2 text-left text-sm ${createForm.type === t.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
                  >
                    <span className="mr-2">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!createForm.name} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {["admin", "mentor", "member"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    className={`p-2 rounded-lg border-2 text-sm capitalize ${inviteRole === r ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleInvite} disabled={!inviteEmail} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Send Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
