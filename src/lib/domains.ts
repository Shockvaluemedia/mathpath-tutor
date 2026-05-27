// Subject Domain registry — defines available learning domains
// Each domain can be activated independently

export interface DomainDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  tagline: string;
  skills: string[]; // top-level skill names for display
}

export const DOMAINS: DomainDefinition[] = [
  {
    id: "domain-math",
    slug: "mathematics",
    name: "Mathematics",
    description: "Number sense, operations, algebra, geometry, and data analysis",
    icon: "🔢",
    color: "#6366f1",
    isActive: true,
    tagline: "Build confidence from counting to calculus",
    skills: ["Counting", "Addition", "Multiplication", "Fractions", "Algebra", "Geometry", "Statistics"],
  },
  {
    id: "domain-reading",
    slug: "reading",
    name: "Reading",
    description: "Decoding, fluency, vocabulary, and comprehension strategies",
    icon: "📖",
    color: "#10b981",
    isActive: true,
    tagline: "From phonics to critical analysis",
    skills: ["Phonics", "Fluency", "Vocabulary", "Main Idea", "Inference", "Analysis", "Synthesis"],
  },
  {
    id: "domain-writing",
    slug: "writing",
    name: "Writing",
    description: "Grammar, composition, creative writing, and communication",
    icon: "✍️",
    color: "#f59e0b",
    isActive: false,
    tagline: "Express ideas clearly and creatively",
    skills: ["Grammar", "Sentences", "Paragraphs", "Essays", "Creative Writing", "Persuasion"],
  },
  {
    id: "domain-science",
    slug: "science",
    name: "Science",
    description: "Scientific method, earth science, life science, physical science",
    icon: "🔬",
    color: "#8b5cf6",
    isActive: false,
    tagline: "Discover how the world works",
    skills: ["Observation", "Hypothesis", "Earth Science", "Life Science", "Physics", "Chemistry"],
  },
  {
    id: "domain-ai",
    slug: "ai-literacy",
    name: "AI Literacy",
    description: "Understanding AI, prompt engineering, ethical AI use, and computational thinking",
    icon: "🤖",
    color: "#ec4899",
    isActive: true,
    tagline: "Understand and work with AI responsibly",
    skills: ["What is AI", "Prompting", "AI Ethics", "Data Literacy", "Automation", "Critical Evaluation"],
  },
  {
    id: "domain-finance",
    slug: "financial-literacy",
    name: "Financial Literacy",
    description: "Budgeting, saving, investing, and financial decision-making",
    icon: "💰",
    color: "#14b8a6",
    isActive: false,
    tagline: "Build smart money habits early",
    skills: ["Earning", "Saving", "Budgeting", "Investing", "Credit", "Taxes"],
  },
  {
    id: "domain-entrepreneurship",
    slug: "entrepreneurship",
    name: "Entrepreneurship",
    description: "Business thinking, problem-solving, and value creation",
    icon: "🚀",
    color: "#f97316",
    isActive: false,
    tagline: "Think like a builder and creator",
    skills: ["Ideas", "Problem-Solving", "Planning", "Marketing", "Leadership", "Resilience"],
  },
  {
    id: "domain-leadership",
    slug: "leadership",
    name: "Leadership",
    description: "Communication, teamwork, decision-making, and influence",
    icon: "👑",
    color: "#eab308",
    isActive: false,
    tagline: "Lead yourself and others with confidence",
    skills: ["Self-Awareness", "Communication", "Teamwork", "Decision-Making", "Empathy", "Influence"],
  },
];

export function getDomain(slug: string): DomainDefinition | undefined {
  return DOMAINS.find((d) => d.slug === slug);
}

export function getActiveDomains(): DomainDefinition[] {
  return DOMAINS.filter((d) => d.isActive);
}

export function getDomainById(id: string): DomainDefinition | undefined {
  return DOMAINS.find((d) => d.id === id);
}
