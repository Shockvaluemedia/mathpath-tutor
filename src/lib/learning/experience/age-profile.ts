export interface AgeAppropriateExperience {
  maximumSentences: number;
  vocabulary: string;
  exampleContexts: string[];
  visualDensity: "HIGH" | "MODERATE" | "LOW";
  scaffolding: "MICRO_STEPS" | "GUIDED_STEPS" | "CONCISE_SUPPORT";
  sessionMinutes: number;
  challengeLevel: "FOUNDATIONAL" | "GRADE_ALIGNED" | "EXTENSION";
  motivationalFraming: string;
  avoidChildishLanguage: true;
}

export function buildAgeAppropriateExperience(input: {
  developmentalStage: string;
  learnerGrade: number;
  skillGradeMax?: number | null;
  confidenceLevel: number;
  currentFrustration: boolean;
}): AgeAppropriateExperience {
  const older = ["HIGH_SCHOOL", "ADULT"].includes(input.developmentalStage);
  const middle = input.developmentalStage === "MIDDLE" || input.developmentalStage === "MIDDLE_SCHOOL";
  const workingBelowGrade = input.skillGradeMax !== null && input.skillGradeMax !== undefined && input.skillGradeMax < input.learnerGrade - 1;
  const needsReducedLoad = input.currentFrustration || input.confidenceLevel <= 3;
  return {
    maximumSentences: older ? 6 : middle ? 5 : 4,
    vocabulary: older ? "Direct, precise language; define necessary math terms without simplifying the learner's maturity." : middle ? "Clear academic language with brief definitions." : "Concrete, familiar language with one new term at a time.",
    exampleContexts: older ? ["work", "sports statistics", "personal finance", "technology"] : middle ? ["music", "games", "sports", "school projects"] : ["sharing", "collections", "measurement", "everyday choices"],
    visualDensity: needsReducedLoad ? "LOW" : older ? "LOW" : middle ? "MODERATE" : "HIGH",
    scaffolding: needsReducedLoad ? "MICRO_STEPS" : older ? "CONCISE_SUPPORT" : "GUIDED_STEPS",
    sessionMinutes: needsReducedLoad ? 10 : older ? 20 : middle ? 18 : 15,
    challengeLevel: workingBelowGrade ? "FOUNDATIONAL" : "GRADE_ALIGNED",
    motivationalFraming: older ? "Emphasize agency, usefulness, and progress without praise that sounds juvenile." : "Emphasize effort, strategy choice, and visible progress.",
    avoidChildishLanguage: true,
  };
}
