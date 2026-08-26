import { NextRequest, NextResponse } from "next/server";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { DEMO_COGNITIVE_MODELS, DEMO_MODE } from "@/lib/demo-data";
import { getPersistedLearnerCognitiveModel } from "@/lib/learning/learner-model";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: learnerId } = await params;
    if (DEMO_MODE) {
      const model = DEMO_COGNITIVE_MODELS[learnerId as keyof typeof DEMO_COGNITIVE_MODELS];
      return model
        ? NextResponse.json(model)
        : NextResponse.json({ error: "Learner not found" }, { status: 404 });
    }

    const access = await requireRequestLearnerAccess(request, learnerId);
    if (!access.ok) return access.response;
    const learner = await prisma.learner.findUnique({
      where: { id: learnerId },
      select: { id: true },
    });
    if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

    return NextResponse.json(await getPersistedLearnerCognitiveModel(learnerId));
  } catch (error) {
    console.error("Get learner cognitive model error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
