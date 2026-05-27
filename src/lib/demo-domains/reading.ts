// Reading Comprehension domain — demo data and content

export const READING_DIAGNOSTIC_QUESTIONS = {
  EARLY_CHILDHOOD: [
    { id: "rdq1", skillId: "phonics", skillName: "Phonics", question: "Which word starts with the same sound as 'cat'? (car, dog, fish)", hints: ["Say 'cat' and 'car' out loud — do they start the same?"], correctAnswer: "car", answerType: "multiple-choice", options: ["car", "dog", "fish"], difficulty: 1, gradeBand: "EARLY_CHILDHOOD" },
    { id: "rdq2", skillId: "sight-words", skillName: "Sight Words", question: "Which of these is the word 'the'?", hints: ["It starts with 'th'"], correctAnswer: "the", answerType: "multiple-choice", options: ["the", "that", "then", "them"], difficulty: 1, gradeBand: "EARLY_CHILDHOOD" },
    { id: "rdq3", skillId: "rhyming", skillName: "Rhyming", question: "Which word rhymes with 'hat'? (cat, dog, run)", hints: ["Rhyming words end with the same sound"], correctAnswer: "cat", answerType: "multiple-choice", options: ["cat", "dog", "run"], difficulty: 1, gradeBand: "EARLY_CHILDHOOD" },
  ],
  ELEMENTARY: [
    { id: "rdq4", skillId: "main-idea", skillName: "Main Idea", question: "Read: 'Dogs are great pets. They are loyal, playful, and love their owners.' What is the main idea?", hints: ["What is the whole paragraph about?", "Look at the first sentence"], correctAnswer: "Dogs are great pets", answerType: "free-response", difficulty: 2, gradeBand: "ELEMENTARY" },
    { id: "rdq5", skillId: "vocabulary", skillName: "Vocabulary", question: "What does 'enormous' mean?", hints: ["Think of something really, really big"], correctAnswer: "very large", answerType: "multiple-choice", options: ["very large", "very small", "very fast", "very old"], difficulty: 2, gradeBand: "ELEMENTARY" },
    { id: "rdq6", skillId: "sequence", skillName: "Sequence", question: "Put in order: 'Then she ate breakfast. First, she woke up. Finally, she went to school.'", hints: ["What happens first in the morning?"], correctAnswer: "First she woke up, then she ate breakfast, finally she went to school", answerType: "free-response", difficulty: 2, gradeBand: "ELEMENTARY" },
    { id: "rdq7", skillId: "inference", skillName: "Inference", question: "Read: 'Maria grabbed her umbrella and raincoat before leaving.' What can you infer about the weather?", hints: ["Why would someone need an umbrella?"], correctAnswer: "It was raining or about to rain", answerType: "free-response", difficulty: 3, gradeBand: "ELEMENTARY" },
    { id: "rdq8", skillId: "context-clues", skillName: "Context Clues", question: "Read: 'The famished boy ate three plates of food.' What does 'famished' probably mean?", hints: ["If he ate three plates, how hungry was he?"], correctAnswer: "very hungry", answerType: "free-response", difficulty: 3, gradeBand: "ELEMENTARY" },
  ],
  MIDDLE: [
    { id: "rdq9", skillId: "theme", skillName: "Theme", question: "A story is about a boy who keeps trying to ride a bike and falls many times but finally succeeds. What is the theme?", hints: ["What lesson does the story teach?"], correctAnswer: "Persistence leads to success", answerType: "free-response", difficulty: 3, gradeBand: "MIDDLE" },
    { id: "rdq10", skillId: "figurative-language", skillName: "Figurative Language", question: "What type of figurative language is: 'The wind whispered through the trees'?", hints: ["The wind can't actually whisper — that's a human action"], correctAnswer: "personification", answerType: "multiple-choice", options: ["simile", "metaphor", "personification", "hyperbole"], difficulty: 3, gradeBand: "MIDDLE" },
    { id: "rdq11", skillId: "point-of-view", skillName: "Point of View", question: "Read: 'I walked into the room and saw my surprise party.' What point of view is this?", hints: ["Who is telling the story? Look for 'I'"], correctAnswer: "first person", answerType: "multiple-choice", options: ["first person", "second person", "third person"], difficulty: 2, gradeBand: "MIDDLE" },
    { id: "rdq12", skillId: "text-structure", skillName: "Text Structure", question: "A passage explains what caused a flood and what happened because of it. What text structure is this?", hints: ["It talks about what led to something and the result"], correctAnswer: "cause and effect", answerType: "multiple-choice", options: ["cause and effect", "compare and contrast", "chronological", "problem and solution"], difficulty: 3, gradeBand: "MIDDLE" },
  ],
  HIGH_SCHOOL: [
    { id: "rdq13", skillId: "argument-analysis", skillName: "Argument Analysis", question: "Identify the logical fallacy: 'Everyone is buying this phone, so it must be the best one.'", hints: ["Just because something is popular, does that make it good?"], correctAnswer: "bandwagon fallacy", answerType: "free-response", difficulty: 4, gradeBand: "HIGH_SCHOOL" },
    { id: "rdq14", skillId: "synthesis", skillName: "Synthesis", question: "How would you combine information from a news article and a scientific study to form your own conclusion about climate change?", hints: ["Think about what each source offers and how they complement each other"], correctAnswer: "Compare claims with evidence, identify agreements and gaps, form evidence-based conclusion", answerType: "open-ended", difficulty: 5, gradeBand: "HIGH_SCHOOL" },
  ],
};

export const READING_DEMO_LESSON = {
  title: "Finding the Main Idea",
  focusSkill: "Main Idea",
  domainId: "domain-reading",
  stage: "ELEMENTARY",
  contentType: "LESSON",
  sections: [
    {
      key: "warmup",
      title: "Quick Warmup",
      instructions: "Let's warm up our reading brains!",
      content: "Read each short sentence and tell me what it's mostly about.",
      questions: [
        { question: "Read: 'Cats like to sleep, play with yarn, and chase mice.' What is this sentence about?", hints: ["What animal is mentioned?"], answer: "Cats", explanation: "The sentence is all about what cats like to do." },
        { question: "Read: 'The park has swings, slides, and a sandbox.' What is this about?", hints: ["What place is being described?"], answer: "The park", explanation: "The sentence describes things you find at a park." },
      ],
    },
    {
      key: "instruction",
      title: "What Is the Main Idea?",
      instructions: "Read this carefully — it's the key concept for today!",
      content: "The MAIN IDEA is what a passage is mostly about. It's the big picture — the one thing the author wants you to understand.\n\nThink of it like this: if you had to tell a friend what you read in ONE sentence, that's the main idea.\n\nHow to find it:\n1. Read the whole passage first\n2. Ask: 'What is this mostly about?'\n3. Look at the first and last sentences — they often contain the main idea\n4. Check: do the other sentences support your answer?\n\nThe main idea is NOT a small detail. It's the umbrella that covers everything else.",
      questions: [],
    },
    {
      key: "guided-practice",
      title: "Let's Practice Together",
      instructions: "Read each passage and find the main idea. Use the hints if you need them!",
      content: "I'll guide you through finding the main idea step by step.",
      questions: [
        { question: "Read: 'Bees are very important to our world. They help flowers grow by spreading pollen. Without bees, many of our favorite fruits wouldn't exist.' What is the main idea?", hints: ["What is the whole passage about?", "The first sentence often tells you"], answer: "Bees are very important to our world", explanation: "The passage explains WHY bees are important — that's the main idea. The other sentences are supporting details." },
        { question: "Read: 'My dog Max loves the beach. He runs in the sand, splashes in the waves, and digs holes everywhere.' What is the main idea?", hints: ["Who is this about and what do they love?"], answer: "Max loves the beach", explanation: "Everything in the passage supports the idea that Max loves the beach." },
      ],
    },
    {
      key: "independent-practice",
      title: "Your Turn!",
      instructions: "Find the main idea on your own. You've got this!",
      content: "Read each passage and identify the main idea.",
      questions: [
        { question: "Read: 'Recycling helps the Earth. It reduces trash in landfills. It saves energy. It also keeps our air and water cleaner.' What is the main idea?", hints: ["What do all the sentences support?"], answer: "Recycling helps the Earth", explanation: "Every sentence gives a reason why recycling helps — that's supporting the main idea." },
        { question: "Read: 'Spiders are not insects. Insects have six legs, but spiders have eight. Insects have three body parts, but spiders have two.' What is the main idea?", hints: ["What is being compared?"], answer: "Spiders are not insects", explanation: "The passage explains the differences to prove spiders aren't insects." },
        { question: "Read: 'Learning to ride a bike takes practice. You might fall at first. But if you keep trying, you'll get better. Soon you'll be riding without help!' What is the main idea?", hints: ["What's the overall message?"], answer: "Learning to ride a bike takes practice", explanation: "The passage is about how practice leads to success in bike riding." },
      ],
    },
    {
      key: "challenge",
      title: "Challenge",
      instructions: "This one's trickier — the main idea isn't stated directly!",
      content: "Sometimes the main idea is implied — you have to figure it out from the details.",
      questions: [
        { question: "Read: 'Sarah studied every night for a week. She made flashcards and quizzed herself. She asked her teacher for extra help. On test day, she got an A+.' What is the implied main idea?", hints: ["What did all of Sarah's actions lead to?", "What's the connection between her effort and her grade?"], answer: "Hard work and preparation lead to success", explanation: "The main idea isn't stated directly, but all the details show that Sarah's hard work paid off." },
      ],
    },
    {
      key: "reflection",
      title: "Reflection",
      instructions: "Think about what you learned today.",
      content: "Great work! Think about:\n\n• What's your strategy for finding the main idea?\n• Was the challenge question harder? Why?\n• Can you find the main idea in something you read today — a book, a sign, even a text message?\n\nRemember: the main idea is the BIG picture. Details support it, but the main idea is what everything connects back to.",
      questions: [],
    },
  ],
};

export const READING_TUTOR_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Great question about reading! Let me help you think about this. What part of the passage stood out to you?",
    "I love that you're thinking about this! Before I explain, can you tell me what you noticed first when you read it?",
  ],
  hint: [
    "Try re-reading the first sentence — authors often put the main idea right at the beginning. What do you notice?",
    "Here's a trick: cover up the details and ask yourself 'what is this MOSTLY about?' What comes to mind?",
  ],
  encouragement: [
    "You're getting better at this! Finding the main idea is like being a detective — you're looking for the big clue. ⭐",
    "Great thinking! You're learning to see the big picture, and that's a skill that helps in everything you read.",
  ],
  frustration: [
    "Reading can feel tricky sometimes, and that's okay. Let's slow down and look at just one sentence at a time. Which sentence do you want to start with?",
    "I get it — sometimes passages feel confusing. Here's what helps: don't worry about understanding every word. Just ask 'what is this about?' and we'll build from there.",
  ],
};

export const READING_PROGRESS = {
  stats: {
    lessonsCompletedThisWeek: 3,
    totalLessons: 8,
    timeSpentMinutes: 40,
    masteredSkillsCount: 3,
    avgConfidence: 6.2,
    confidenceTrend: "improving" as const,
    tutorSessionsThisWeek: 2,
  },
  skills: {
    mastered: [
      { name: "Phonics", domain: "Reading", score: 92 },
      { name: "Sight Words", domain: "Reading", score: 88 },
      { name: "Rhyming", domain: "Reading", score: 85 },
    ],
    developing: [
      { name: "Main Idea", domain: "Reading", score: 60 },
      { name: "Vocabulary", domain: "Reading", score: 55 },
      { name: "Sequence", domain: "Reading", score: 50 },
    ],
    weak: [
      { name: "Inference", domain: "Reading", score: 25 },
      { name: "Context Clues", domain: "Reading", score: 30 },
    ],
  },
};
