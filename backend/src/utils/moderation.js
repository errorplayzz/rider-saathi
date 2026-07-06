// Simple Profanity and Moderation Filter

const badWords = [
  'spam',
  'scam',
  'abuse',
  'idiot',
  'stupid',
  'fake',
  'fraud'
  // Add more aggressive filters in production
];

/**
 * Checks if a string contains any blocked words.
 * Returns true if the text is clean, false if profanity is found.
 */
export const isCleanText = (text) => {
  if (!text) return true;
  const lowerText = text.toLowerCase();
  for (const word of badWords) {
    // Basic word boundary check
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      return false;
    }
  }
  return true;
};

/**
 * Censors bad words in a string by replacing them with asterisks.
 */
export const censorText = (text) => {
  if (!text) return text;
  let censored = text;
  for (const word of badWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censored = censored.replace(regex, '*'.repeat(word.length));
  }
  return censored;
};
