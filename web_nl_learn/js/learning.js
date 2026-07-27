export function normaliseSentence(value) {
  return String(value ?? '')
    .trim()
    .replace(/[.!?]+$/u, '')
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('nl-NL');
}

export function isCorrectSentence(selectedWords, expectedSentence) {
  const selected = Array.isArray(selectedWords) ? selectedWords.join(' ') : selectedWords;
  return normaliseSentence(selected) === normaliseSentence(expectedSentence);
}

export function remainingWords(allWords, selectedWords) {
  const counts = new Map();
  for (const word of selectedWords) counts.set(word, (counts.get(word) ?? 0) + 1);
  return allWords.filter((word) => {
    const count = counts.get(word) ?? 0;
    if (count === 0) return true;
    counts.set(word, count - 1);
    return false;
  });
}

export function completionPercentage(completed, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const safeCompleted = Math.max(0, Math.min(Number(completed) || 0, total));
  return Math.round((safeCompleted / total) * 100);
}

export function selectDutchVoice(voices = []) {
  const normalized = voices.filter(Boolean);
  return normalized.find((voice) => String(voice.lang).toLowerCase() === 'nl-nl')
    ?? normalized.find((voice) => String(voice.lang).toLowerCase() === 'nl-be')
    ?? normalized.find((voice) => String(voice.lang).toLowerCase().startsWith('nl'))
    ?? null;
}

export function filterVocabulary(words, category = 'alle', query = '') {
  const normalizedQuery = String(query).trim().toLocaleLowerCase('nl-NL');
  return words.filter((item) => {
    const categoryMatches = category === 'alle' || item.category === category;
    const searchable = `${item.word} ${item.definition} ${item.example}`.toLocaleLowerCase('nl-NL');
    return categoryMatches && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}

export function getGreeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export function safeProgress(raw = {}) {
  return {
    minutes: Math.max(0, Number(raw.minutes) || 0),
    completed: Math.max(0, Number(raw.completed) || 0),
    audioPlays: Math.max(0, Number(raw.audioPlays) || 0),
    wordOrderCompleted: Boolean(raw.wordOrderCompleted),
    practiceCompleted: Math.max(0, Number(raw.practiceCompleted) || 0),
  };
}
