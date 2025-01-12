interface ReadingGuideline {
  wordCount: string;
  sentenceLength: string;
  vocabulary: string;
  concepts: string;
  structure: string;
}

export const getReadingLevelGuidelines = (readingLevel: string): ReadingGuideline => {
  const guidelines: Record<string, ReadingGuideline> = {
    k: {
      wordCount: "50-100",
      sentenceLength: "3-5 words",
      vocabulary: "simple, familiar words only",
      concepts: "concrete, immediate environment",
      structure: "repetitive patterns, sight words frequently repeated"
    },
    "1": {
      wordCount: "100-200",
      sentenceLength: "5-7 words",
      vocabulary: "common sight words, basic phonetic words",
      concepts: "familiar situations, simple sequences",
      structure: "simple sentences, clear cause-effect"
    },
    "2": {
      wordCount: "200-300",
      sentenceLength: "7-10 words",
      vocabulary: "grade-appropriate sight words, basic compound words",
      concepts: "expanded environments, basic problem-solving",
      structure: "mix of simple and compound sentences"
    },
    "3": {
      wordCount: "300-400",
      sentenceLength: "8-12 words",
      vocabulary: "more complex vocabulary with context clues",
      concepts: "multiple events, basic character development",
      structure: "varied sentence structures"
    },
    "4": {
      wordCount: "400-500",
      sentenceLength: "10-14 words",
      vocabulary: "rich vocabulary with context support",
      concepts: "more complex plots, character emotions",
      structure: "complex sentences, paragraphs"
    },
    "5": {
      wordCount: "500-600",
      sentenceLength: "12-15 words",
      vocabulary: "challenging vocabulary with context",
      concepts: "abstract ideas, multiple plot lines",
      structure: "varied paragraph lengths, dialogue"
    },
    "teen": {
      wordCount: "800-1000",
      sentenceLength: "15-20 words",
      vocabulary: "advanced vocabulary, literary devices",
      concepts: "complex themes, character development, multiple subplots",
      structure: "sophisticated narrative structure, varied writing techniques"
    }
  };

  return guidelines[readingLevel] || guidelines["k"];
};