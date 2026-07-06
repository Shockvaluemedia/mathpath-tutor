import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { getDomain } from "@/lib/domains";
import { READING_DEMO_LESSON } from "@/lib/demo-domains/reading";
import { AI_LITERACY_DEMO_LESSON } from "@/lib/demo-domains/ai-literacy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await request.json().catch(() => ({}));

    const domain = getDomain(slug);
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (DEMO_MODE) {
      let lesson;
      switch (slug) {
        case "reading":
          lesson = READING_DEMO_LESSON;
          break;
        case "ai-literacy":
          lesson = AI_LITERACY_DEMO_LESSON;
          break;
        default:
          // For math, use the existing lesson generation
          return NextResponse.json({ redirect: "/api/lessons/generate" });
      }
      return NextResponse.json({ lesson, lessonId: `demo-${slug}-lesson-${Date.now()}` });
    }

    // Production: use the module engine
    return NextResponse.json({ error: "Production mode not yet implemented for this domain" }, { status: 501 });
  } catch (error) {
    console.error("Domain lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
