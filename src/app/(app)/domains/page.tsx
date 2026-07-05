"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Lock, ArrowRight } from "lucide-react";
import { DOMAINS, DomainDefinition } from "@/lib/domains";

export default function DomainsPage() {
  const router = useRouter();
  const { currentStudent } = useAuth();
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  useEffect(() => {
    // Load current domain from localStorage
    const stored = localStorage.getItem("mathpath_domain");
    setActiveDomain(stored || "mathematics");
  }, []);

  const selectDomain = (domain: DomainDefinition) => {
    if (!domain.isActive) return;
    localStorage.setItem("mathpath_domain", domain.slug);
    setActiveDomain(domain.slug);
    router.push(`/domains/${domain.slug}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Learning Domains</h1>
        <p className="text-gray-600">
          Choose what {currentStudent?.name || "you"} want{currentStudent ? "s" : ""} to learn today
        </p>
      </div>

      {/* Active Domains */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Available Now</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {DOMAINS.filter((d) => d.isActive).map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              isSelected={activeDomain === domain.slug}
              onSelect={() => selectDomain(domain)}
            />
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Coming Soon</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOMAINS.filter((d) => !d.isActive).map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              isSelected={false}
              onSelect={() => {}}
              locked
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DomainCard({
  domain,
  isSelected,
  onSelect,
  locked = false,
}: {
  domain: DomainDefinition;
  isSelected: boolean;
  onSelect: () => void;
  locked?: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        locked ? "opacity-60 cursor-not-allowed" : ""
      } ${isSelected ? "ring-2 ring-offset-2" : ""}`}
      style={isSelected ? { borderColor: domain.color } : {}}
      onClick={locked ? undefined : onSelect}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{domain.icon}</span>
          {locked ? (
            <Lock className="h-4 w-4 text-gray-400" />
          ) : isSelected ? (
            <Badge style={{ backgroundColor: domain.color }} className="text-white text-xs">Active</Badge>
          ) : null}
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{domain.name}</h3>
        <p className="text-xs text-gray-500 mb-3">{domain.tagline}</p>
        <div className="flex flex-wrap gap-1">
          {domain.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="outline" className="text-[10px] py-0">
              {skill}
            </Badge>
          ))}
          {domain.skills.length > 4 && (
            <Badge variant="outline" className="text-[10px] py-0">
              +{domain.skills.length - 4}
            </Badge>
          )}
        </div>
        {!locked && !isSelected && (
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" style={{ color: domain.color }}>
            Start Learning <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
