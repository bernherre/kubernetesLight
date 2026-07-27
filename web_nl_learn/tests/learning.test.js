import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completionPercentage,
  filterVocabulary,
  getGreeting,
  isCorrectSentence,
  normaliseSentence,
  remainingWords,
  safeProgress,
  selectDutchVoice,
} from '../js/learning.js';

test('normaliseSentence negeert hoofdletters, extra spaties en eindpunctuatie', () => {
  assert.equal(normaliseSentence('  Vandaag   werk ik thuis. '), 'vandaag werk ik thuis');
});

test('isCorrectSentence controleert de woordvolgorde', () => {
  assert.equal(isCorrectSentence(['Vandaag', 'werk', 'ik', 'thuis'], 'Vandaag werk ik thuis.'), true);
  assert.equal(isCorrectSentence(['Vandaag', 'ik', 'werk', 'thuis'], 'Vandaag werk ik thuis.'), false);
});

test('remainingWords ondersteunt herhaalde woorden', () => {
  assert.deepEqual(remainingWords(['ik', 'zie', 'ik'], ['ik']), ['zie', 'ik']);
});

test('completionPercentage begrenst de voortgang', () => {
  assert.equal(completionPercentage(12, 20), 60);
  assert.equal(completionPercentage(30, 20), 100);
  assert.equal(completionPercentage(2, 0), 0);
});

test('selectDutchVoice kiest nl-NL, daarna nl-BE en daarna een Nederlandse fallback', () => {
  const voices = [{ name: 'Generiek', lang: 'nl' }, { name: 'Belgisch', lang: 'nl-BE' }, { name: 'Nederlands', lang: 'nl-NL' }];
  assert.equal(selectDutchVoice(voices).name, 'Nederlands');
  assert.equal(selectDutchVoice(voices.slice(0, 2)).name, 'Belgisch');
  assert.equal(selectDutchVoice([voices[0]]).name, 'Generiek');
});

test('filterVocabulary combineert thema en zoektekst', () => {
  const words = [
    { word: 'de fiets', category: 'vervoer', definition: 'twee wielen', example: 'Ik fiets.' },
    { word: 'het huis', category: 'wonen', definition: 'gebouw', example: 'Ik woon hier.' },
  ];
  assert.deepEqual(filterVocabulary(words, 'vervoer', ''), [words[0]]);
  assert.deepEqual(filterVocabulary(words, 'alle', 'woon'), [words[1]]);
});

test('getGreeting kiest een passende Nederlandse daggroet', () => {
  assert.equal(getGreeting(8), 'Goedemorgen');
  assert.equal(getGreeting(15), 'Goedemiddag');
  assert.equal(getGreeting(21), 'Goedenavond');
});

test('safeProgress herstelt ongeldige lokale waarden veilig', () => {
  assert.deepEqual(safeProgress({ minutes: -3, completed: '2', audioPlays: 'x', wordOrderCompleted: 1 }), {
    minutes: 0, completed: 2, audioPlays: 0, wordOrderCompleted: true, practiceCompleted: 0,
  });
});
