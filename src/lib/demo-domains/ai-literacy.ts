// AI Literacy domain — demo data and content

export const AI_LITERACY_DIAGNOSTIC_QUESTIONS = {
  ELEMENTARY: [
    { id: "aiq1", skillId: "what-is-ai", skillName: "What is AI", question: "Which of these is an example of AI? (A calculator, a self-driving car, a light switch)", hints: ["AI can learn and make decisions on its own"], correctAnswer: "a self-driving car", answerType: "multiple-choice", options: ["a calculator", "a self-driving car", "a light switch", "a toaster"], difficulty: 1, gradeBand: "ELEMENTARY" },
    { id: "aiq2", skillId: "ai-vs-human", skillName: "AI vs Human", question: "What can humans do that AI cannot? (Feel emotions, do math quickly, search the internet)", hints: ["Think about what makes humans special"], correctAnswer: "Feel emotions", answerType: "multiple-choice", options: ["Feel emotions", "Do math quickly", "Search the internet", "Store information"], difficulty: 2, gradeBand: "ELEMENTARY" },
    { id: "aiq3", skillId: "ai-examples", skillName: "AI in Daily Life", question: "Name one way you might use AI in your daily life.", hints: ["Think about voice assistants, recommendations, or autocorrect"], correctAnswer: "Voice assistants, recommendations, autocorrect, etc.", answerType: "free-response", difficulty: 2, gradeBand: "ELEMENTARY" },
  ],
  MIDDLE: [
    { id: "aiq4", skillId: "prompting", skillName: "Prompting", question: "Which is a better prompt for an AI? A) 'Write something' B) 'Write a 3-paragraph essay about recycling for 7th graders'", hints: ["Better prompts are specific and clear"], correctAnswer: "B", answerType: "multiple-choice", options: ["A", "B"], difficulty: 2, gradeBand: "MIDDLE" },
    { id: "aiq5", skillId: "ai-bias", skillName: "AI Ethics", question: "Why might an AI make unfair decisions?", hints: ["Think about what AI learns from — data created by humans"], correctAnswer: "AI learns from biased data created by humans", answerType: "free-response", difficulty: 3, gradeBand: "MIDDLE" },
    { id: "aiq6", skillId: "ai-limitations", skillName: "AI Limitations", question: "Can AI always tell the difference between true and false information?", hints: ["Think about whether AI 'understands' truth"], correctAnswer: "No, AI can generate or repeat false information", answerType: "free-response", difficulty: 3, gradeBand: "MIDDLE" },
    { id: "aiq7", skillId: "data-literacy", skillName: "Data Literacy", question: "If an AI is trained only on photos of cats, what will it be bad at recognizing?", hints: ["It only knows what it's been shown"], correctAnswer: "Anything that isn't a cat (dogs, birds, etc.)", answerType: "free-response", difficulty: 2, gradeBand: "MIDDLE" },
  ],
  HIGH_SCHOOL: [
    { id: "aiq8", skillId: "critical-evaluation", skillName: "Critical Evaluation", question: "How would you verify if an AI-generated article contains accurate information?", hints: ["Think about cross-referencing and source checking"], correctAnswer: "Cross-reference with reliable sources, check citations, verify claims independently", answerType: "open-ended", difficulty: 4, gradeBand: "HIGH_SCHOOL" },
    { id: "aiq9", skillId: "ai-ethics-advanced", skillName: "AI Ethics (Advanced)", question: "Should AI be used to make decisions about who gets a job interview? What are the risks?", hints: ["Think about fairness, bias, and accountability"], correctAnswer: "Risks include bias amplification, lack of context, accountability gaps", answerType: "open-ended", difficulty: 5, gradeBand: "HIGH_SCHOOL" },
  ],
};

export const AI_LITERACY_DEMO_LESSON = {
  title: "What Is AI and How Does It Learn?",
  focusSkill: "What is AI",
  domainId: "domain-ai",
  stage: "MIDDLE",
  contentType: "LESSON",
  sections: [
    {
      key: "warmup",
      title: "Quick Think",
      instructions: "Think about these questions before we start.",
      content: "Before we dive in, let's see what you already know about AI.",
      questions: [
        { question: "Name something you've used today that might have AI in it.", hints: ["Phone, social media, search engines..."], answer: "Various (phone, YouTube, Spotify, etc.)", explanation: "AI is in many everyday tools — from autocorrect to video recommendations!" },
        { question: "True or false: AI can think and feel like a human.", hints: ["Think about what 'thinking' and 'feeling' really mean"], answer: "False", explanation: "AI processes information and finds patterns, but it doesn't think or feel. It's a tool, not a mind." },
      ],
    },
    {
      key: "instruction",
      title: "What Is Artificial Intelligence?",
      instructions: "Read this carefully — these are the foundations of AI literacy.",
      content: "AI (Artificial Intelligence) is technology that can learn from data and make decisions or predictions.\n\nKey concepts:\n\n1. AI LEARNS FROM DATA — It's trained on examples. Show it 1000 pictures of dogs, and it learns to recognize dogs.\n\n2. AI FINDS PATTERNS — It's really good at spotting patterns humans might miss. But it doesn't 'understand' what it's looking at.\n\n3. AI IS A TOOL — It's created by humans, trained by humans, and used by humans. It's not magic or alive.\n\n4. AI CAN BE WRONG — It makes mistakes, especially when the data it learned from was incomplete or biased.\n\nTypes of AI you encounter daily:\n• Recommendations (YouTube, Spotify)\n• Voice assistants (Siri, Alexa)\n• Autocorrect and predictive text\n• Image filters\n• Search engines\n• Chatbots",
      questions: [],
    },
    {
      key: "guided-practice",
      title: "Identifying AI",
      instructions: "Let's practice recognizing AI in the real world.",
      content: "For each scenario, decide: Is this AI or not?",
      questions: [
        { question: "Netflix suggests a movie you might like based on what you've watched before. Is this AI?", hints: ["Is it learning from your behavior to make predictions?"], answer: "Yes", explanation: "Netflix uses AI to analyze your viewing patterns and recommend content you're likely to enjoy." },
        { question: "A calculator computes 247 × 38. Is this AI?", hints: ["Is it learning or just following a fixed formula?"], answer: "No", explanation: "A calculator follows fixed rules. It doesn't learn or adapt. AI learns from data and improves over time." },
        { question: "Your phone's autocorrect suggests the next word you might type. Is this AI?", hints: ["Does it adapt to YOUR typing patterns?"], answer: "Yes", explanation: "Predictive text uses AI — it learns from your typing patterns to make better suggestions over time." },
      ],
    },
    {
      key: "independent-practice",
      title: "Think Deeper",
      instructions: "Apply what you've learned to these scenarios.",
      content: "Use your understanding of AI to answer these questions.",
      questions: [
        { question: "If an AI is trained only on English text, what language will it struggle with?", hints: ["AI only knows what it's been trained on"], answer: "Any language other than English", explanation: "AI can only work well with what it's been trained on. No training data = no ability." },
        { question: "A company uses AI to sort job applications. The AI was trained on past hiring decisions where mostly men were hired. What might go wrong?", hints: ["If the past was biased, what will the AI learn?"], answer: "The AI might unfairly reject women's applications", explanation: "AI learns from historical data. If that data contains bias, the AI will repeat and amplify that bias." },
        { question: "Why is it important to check AI-generated information before sharing it?", hints: ["Can AI always tell fact from fiction?"], answer: "AI can generate convincing but incorrect information", explanation: "AI doesn't verify truth — it generates plausible-sounding text. Always fact-check AI output." },
      ],
    },
    {
      key: "challenge",
      title: "Challenge",
      instructions: "This requires deeper thinking about AI's role in society.",
      content: "Think critically about AI's impact.",
      questions: [
        { question: "Should schools use AI to grade essays? What are the benefits AND risks?", hints: ["Think about fairness, creativity, and what AI might miss"], answer: "Benefits: speed, consistency. Risks: missing creativity, cultural context, nuance, bias", explanation: "This is a real debate! AI grading is fast and consistent, but may miss creative thinking, cultural references, and personal voice." },
      ],
    },
    {
      key: "reflection",
      title: "Reflection",
      instructions: "Think about how AI connects to your life.",
      content: "Nice work! Reflect on these:\n\n• What surprised you most about AI today?\n• Can you think of a time AI helped you? A time it got something wrong?\n• How will you be a more critical user of AI going forward?\n\nRemember: AI is a powerful tool, but YOU are the one who decides how to use it. Being AI-literate means understanding both its power and its limits.",
      questions: [],
    },
  ],
};

export const AI_LITERACY_PROGRESS = {
  stats: {
    lessonsCompletedThisWeek: 2,
    totalLessons: 4,
    timeSpentMinutes: 25,
    masteredSkillsCount: 1,
    avgConfidence: 7.0,
    confidenceTrend: "improving" as const,
    tutorSessionsThisWeek: 1,
  },
  skills: {
    mastered: [
      { name: "AI in Daily Life", domain: "AI Literacy", score: 90 },
    ],
    developing: [
      { name: "What is AI", domain: "AI Literacy", score: 70 },
      { name: "AI vs Human", domain: "AI Literacy", score: 55 },
      { name: "Prompting", domain: "AI Literacy", score: 45 },
    ],
    weak: [
      { name: "AI Ethics", domain: "AI Literacy", score: 20 },
      { name: "Data Literacy", domain: "AI Literacy", score: 15 },
      { name: "Critical Evaluation", domain: "AI Literacy", score: 10 },
    ],
  },
};
