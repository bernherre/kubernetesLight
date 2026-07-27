import {
  completionPercentage,
  filterVocabulary,
  getGreeting,
  isCorrectSentence,
  remainingWords,
  safeProgress,
  selectDutchVoice,
} from './learning.js';
import {
  concepts,
  dailyPlan,
  grammarTopics,
  levels,
  listeningScenes,
  verbs,
  vocabulary,
} from './content.js';

const STORAGE_KEY = 'nederlands-gewoon-doen-progress-v2';
const SETTINGS_KEY = 'nederlands-gewoon-doen-settings-v2';
const EXERCISE_WORDS = ['Vandaag', 'werk', 'ik', 'thuis'];
const EXPECTED_SENTENCE = 'Vandaag werk ik thuis.';

const state = {
  page: 'vandaag',
  voices: [],
  dutchVoice: null,
  selectedWords: [],
  grammarLevel: 'alle',
  grammarTopic: 'woordvolgorde',
  concept: 'grammatica',
  vocabularyCategory: 'alle',
  vocabularyQuery: '',
  practice: 'order',
  practiceSelection: [],
  progress: readProgress(),
  settings: readSettings(),
};

const el = (id) => document.getElementById(id);
const elements = {
  sidebar: el('sidebar'), menuButton: el('menu-button'), pageContext: el('page-context'),
  goalMinutes: el('goal-minutes'), goalBar: el('goal-bar'), toast: el('toast'),
  answerZone: el('answer-zone'), wordBank: el('word-bank'), feedback: el('exercise-feedback'),
  checkAnswer: el('check-answer'), resetExercise: el('reset-exercise'), listenAnswer: el('listen-answer'),
  voiceStatus: el('voice-status'), settingsVoiceStatus: el('settings-voice-status'),
  dailyPlan: el('daily-plan'), dailyVocabulary: el('daily-vocabulary'), levelPath: el('level-path'),
  conceptGrid: el('concept-grid'), conceptDetail: el('concept-detail'),
  grammarFilters: el('grammar-filters'), grammarList: el('grammar-list'), grammarDetail: el('grammar-detail'),
  verbSelect: el('verb-select'), verbMeaning: el('verb-meaning'), verbDetail: el('verb-detail'), speakVerb: el('speak-verb'),
  vocabularyFilters: el('vocabulary-filters'), vocabularyGrid: el('vocabulary-grid'), wordSearch: el('word-search'),
  listeningGrid: el('listening-grid'), practiceStage: el('practice-stage'),
  progressMinutes: el('progress-minutes'), progressCompleted: el('progress-completed'), progressAudio: el('progress-audio'),
  skillProgress: el('skill-progress'), clearProgress: el('clear-progress'),
  settingsDialog: el('settings-dialog'), darkModeSetting: el('dark-mode-setting'),
  speechRate: el('speech-rate'), speechRateOutput: el('speech-rate-output'), themeToggle: el('theme-toggle'),
};

function readProgress() {
  try { return safeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return safeProgress(); }
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch { /* Opslag kan geblokkeerd zijn. */ }
  updateProgressUI();
}

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { theme: stored.theme === 'dark' ? 'dark' : 'light', speechRate: Number(stored.speechRate) || .9 };
  } catch { return { theme: 'light', speechRate: .9 }; }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch { /* Opslag kan geblokkeerd zijn. */ }
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function showPage(page, updateHash = true) {
  const target = document.querySelector(`#page-${page}`);
  if (!target) return;
  state.page = page;
  document.querySelectorAll('.page').forEach((node) => node.classList.toggle('active', node === target));
  document.querySelectorAll('.nav-item').forEach((node) => node.classList.toggle('active', node.dataset.page === page));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"] span:last-child`);
  elements.pageContext.textContent = activeNav?.textContent || (page === 'les' ? 'Visuele les' : 'Nederlands');
  elements.sidebar?.classList.remove('open');
  elements.menuButton?.setAttribute('aria-expanded', 'false');
  if (updateHash) history.replaceState(null, '', `#${page}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadVoices() {
  if (!('speechSynthesis' in window)) {
    updateVoiceStatus('Audio wordt niet ondersteund door deze browser.', false);
    return;
  }
  state.voices = window.speechSynthesis.getVoices();
  state.dutchVoice = selectDutchVoice(state.voices);
  const message = state.dutchVoice
    ? `Stem: ${state.dutchVoice.name} (${state.dutchVoice.lang})`
    : 'Geen specifieke Nederlandse stem gevonden; de browser gebruikt nl-NL als taal.';
  updateVoiceStatus(message, Boolean(state.dutchVoice));
}

function updateVoiceStatus(message, available = true) {
  if (elements.voiceStatus) elements.voiceStatus.textContent = message;
  if (elements.settingsVoiceStatus) elements.settingsVoiceStatus.textContent = message;
  elements.voiceStatus?.classList.toggle('warning', !available);
}

function speak(text, rate) {
  if (!text || !('speechSynthesis' in window)) {
    showToast('Deze browser ondersteunt geen spraaksynthese.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL';
  utterance.rate = Math.min(1.2, Math.max(.5, Number(rate) || state.settings.speechRate));
  utterance.pitch = 1;
  if (state.dutchVoice) utterance.voice = state.dutchVoice;
  utterance.onerror = () => showToast('De uitspraak kon niet worden afgespeeld. Controleer je browserstemmen.');
  window.speechSynthesis.speak(utterance);
  state.progress.audioPlays += 1;
  saveProgress();
}

function vocabularyCard(item) {
  return `<article class="card word-card">
    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}">
    <div class="word-card-body">
      <span class="word-type">${escapeHtml(item.article)}-woord · ${escapeHtml(item.category)}</span>
      <h3>${escapeHtml(item.word)}</h3>
      <p>${escapeHtml(item.definition)}</p>
      <span class="word-example">“${escapeHtml(item.example)}”</span>
      <div class="button-row">
        <button class="sound-button speak" type="button" data-text="${escapeHtml(item.word)}" data-rate="0.85">🔊 Woord</button>
        <button class="sound-button secondary speak" type="button" data-text="${escapeHtml(item.example)}" data-rate="0.9">Zin ▶</button>
      </div>
    </div>
  </article>`;
}

function renderDashboard() {
  const now = new Date();
  el('vandaag-title').textContent = getGreeting(now.getHours());
  el('today-label').textContent = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  elements.dailyPlan.innerHTML = dailyPlan.map((item, index) => `<button class="plan-item" type="button" data-page="${item.page}"><b>${index + 1}</b><span>${item.label}</span><small>${item.duration} min</small></button>`).join('');
  elements.dailyVocabulary.innerHTML = vocabulary.slice(0, 3).map(vocabularyCard).join('');
}

function renderLevels() {
  elements.levelPath.innerHTML = levels.map((level) => `<article class="card level-card ${level.current ? 'current' : ''} ${level.progress === 100 ? 'done' : ''}">
    <div class="level-badge">${level.id}</div>
    <div><span class="kicker">${level.title}</span><h2>${level.description}</h2><div class="module-tags">${level.modules.map((module) => `<span>${module}</span>`).join('')}</div></div>
    <div class="level-progress"><strong>${level.progress}%</strong><div class="meter"><i style="width:${level.progress}%"></i></div></div>
  </article>`).join('');
}

function renderConcepts() {
  elements.conceptGrid.innerHTML = concepts.map((concept) => `<button class="card concept-card ${concept.id === state.concept ? 'active' : ''}" type="button" data-concept="${concept.id}">
    <span class="concept-card-icon">${concept.icon}</span><h2>${concept.title}</h2><p>${concept.description}</p><small>${concept.children.length} kernonderwerpen →</small>
  </button>`).join('');
  renderConceptDetail();
}

function renderConceptDetail() {
  const concept = concepts.find((item) => item.id === state.concept) || concepts[0];
  const related = concept.related.map((id) => concepts.find((item) => item.id === id)?.title).filter(Boolean);
  elements.conceptDetail.innerHTML = `<div class="concept-detail-grid">
    <div><span class="kicker">${concept.icon} ${concept.title}</span><h2>${concept.description}</h2><p>Open een kernonderwerp of volg een verbinding naar een ander taaldomein.</p><div class="connection-tags">${related.map((item) => `<span>verbonden met ${item}</span>`).join('')}</div></div>
    <div class="concept-children">${concept.children.map((child) => `<button type="button" data-concept-child="${escapeHtml(child)}"><strong>${escapeHtml(child)}</strong><br><small>uitleg · voorbeelden · audio</small></button>`).join('')}</div>
  </div>`;
}

function renderGrammarFilters() {
  const filters = ['alle', 'A1', 'A2', 'B1', 'B2'];
  elements.grammarFilters.innerHTML = filters.map((level) => `<button class="${state.grammarLevel === level ? 'active' : ''}" type="button" data-grammar-level="${level}">${level === 'alle' ? 'Alle niveaus' : level}</button>`).join('');
}

function renderGrammar() {
  renderGrammarFilters();
  const filtered = grammarTopics.filter((topic) => state.grammarLevel === 'alle' || topic.level === state.grammarLevel);
  if (!filtered.some((topic) => topic.id === state.grammarTopic)) state.grammarTopic = filtered[0]?.id || grammarTopics[0].id;
  elements.grammarList.innerHTML = filtered.map((topic) => `<button class="topic-button ${topic.id === state.grammarTopic ? 'active' : ''}" type="button" data-grammar-topic="${topic.id}"><small>${topic.level}</small><strong>${topic.title}</strong><span>${topic.summary}</span></button>`).join('');
  const topic = grammarTopics.find((item) => item.id === state.grammarTopic) || grammarTopics[0];
  elements.grammarDetail.innerHTML = `<div class="eyebrow"><span>${topic.level}</span> grammatica</div><h1>${topic.title}</h1><p class="lead">${topic.summary}</p>
    <div class="rule-box"><small>Visueel zinsmodel</small><strong>${topic.rule}</strong></div>
    <div class="section-heading compact"><h2>Voorbeelden</h2><button class="sound-button speak" type="button" data-text="${escapeHtml(topic.examples.join(' '))}" data-rate="0.82">🔊 Luister naar alle voorbeelden</button></div>
    <ul class="example-list">${topic.examples.map((example) => `<li><span>${example}</span><button class="speak" type="button" data-text="${escapeHtml(example)}" data-rate="0.88" aria-label="Luister naar ${escapeHtml(example)}">🔊</button></li>`).join('')}</ul>
    <h3>Gerelateerde concepten</h3><div class="connection-tags">${topic.connections.map((item) => `<span>${item}</span>`).join('')}</div>`;
}

function renderVerbs() {
  elements.verbSelect.innerHTML = verbs.map((verb) => `<option value="${verb.infinitive}">${verb.infinitive}</option>`).join('');
  renderVerbDetail(verbs[0].infinitive);
}

function renderVerbDetail(infinitive) {
  const verb = verbs.find((item) => item.infinitive === infinitive) || verbs[0];
  elements.verbSelect.value = verb.infinitive;
  elements.verbMeaning.innerHTML = `<span class="kicker">Betekenis</span><strong>${verb.meaning}</strong><small>Hulpwerkwoord: ${verb.auxiliary}</small>`;
  elements.speakVerb.dataset.text = verb.infinitive;
  elements.verbDetail.innerHTML = `<div class="section-heading"><div><span class="kicker">Werkwoord</span><h1>${verb.infinitive}</h1></div><button class="icon-sound speak" type="button" data-text="${verb.infinitive}" data-rate="0.75" aria-label="Luister naar ${verb.infinitive}">🔊</button></div>
    <div class="verb-tenses"><div class="tense-card"><h3>Tegenwoordige tijd</h3><ul>${verb.present.map((item) => `<li>${item}</li>`).join('')}</ul></div><div class="tense-card"><h3>Verleden tijd</h3><ul>${verb.past.map((item) => `<li>${item}</li>`).join('')}</ul></div><div class="tense-card"><h3>Voltooide tijd</h3><p>${verb.perfect}</p></div></div>
    <div class="verb-perfect"><span class="kicker">In context</span><ul class="example-list">${verb.examples.map((example) => `<li><span>${example}</span><button class="speak" type="button" data-text="${escapeHtml(example)}" data-rate="0.88">🔊</button></li>`).join('')}</ul></div>`;
}

function renderVocabularyFilters() {
  const categories = ['alle', ...new Set(vocabulary.map((item) => item.category))];
  elements.vocabularyFilters.innerHTML = categories.map((category) => `<button class="${category === state.vocabularyCategory ? 'active' : ''}" type="button" data-vocabulary-category="${category}">${category === 'alle' ? 'Alle thema’s' : category}</button>`).join('');
}

function renderVocabulary() {
  renderVocabularyFilters();
  const filtered = filterVocabulary(vocabulary, state.vocabularyCategory, state.vocabularyQuery);
  elements.vocabularyGrid.innerHTML = filtered.length ? filtered.map(vocabularyCard).join('') : '<div class="card panel"><h2>Geen woorden gevonden</h2><p>Probeer een ander thema of een kortere zoekterm.</p></div>';
}

function renderListening() {
  elements.listeningGrid.innerHTML = listeningScenes.map((scene) => `<article class="card listening-card">
    <img src="${scene.image}" alt="Illustratie bij ${scene.title}">
    <div class="listening-body"><div class="eyebrow"><span>${scene.level}</span> luisterscène</div><h2>${scene.title}</h2><p>${scene.intro}</p>
      <div class="listening-controls"><button class="sound-button speak" type="button" data-text="${escapeHtml(scene.text)}" data-rate="0.92">🔊 Normaal</button><button class="sound-button secondary speak" type="button" data-text="${escapeHtml(scene.text)}" data-rate="0.62">🐢 Langzaam</button></div>
      <details><summary>Bekijk het transcript</summary><p>${scene.text}</p></details>
      <div class="comprehension"><strong>${scene.question}</strong><div class="option-list">${scene.options.map((option, index) => `<button type="button" data-listening-scene="${scene.id}" data-option="${index}">${option}</button>`).join('')}</div></div>
    </div></article>`).join('');
}

function renderMainExercise() {
  elements.wordBank.replaceChildren();
  elements.answerZone.replaceChildren();
  if (state.selectedWords.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Tik hieronder op het eerste woord';
    elements.answerZone.append(placeholder);
  }
  state.selectedWords.forEach((word, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = word;
    button.addEventListener('click', () => { state.selectedWords.splice(index, 1); resetMainExercise(); renderMainExercise(); });
    elements.answerZone.append(button);
  });
  remainingWords(EXERCISE_WORDS, state.selectedWords).forEach((word) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = word;
    button.addEventListener('click', () => { state.selectedWords.push(word); resetMainExercise(); renderMainExercise(); });
    elements.wordBank.append(button);
  });
  elements.checkAnswer.disabled = state.selectedWords.length !== EXERCISE_WORDS.length;
}

function resetMainExercise() {
  elements.answerZone.classList.remove('correct', 'wrong');
  elements.feedback.textContent = 'Tik de woorden in de juiste volgorde aan.';
  elements.checkAnswer.textContent = 'Controleren';
}

function checkMainExercise() {
  const correct = isCorrectSentence(state.selectedWords, EXPECTED_SENTENCE);
  elements.answerZone.classList.remove('correct', 'wrong');
  elements.answerZone.classList.add(correct ? 'correct' : 'wrong');
  if (correct) {
    elements.feedback.textContent = 'Goed gedaan! De persoonsvorm staat op de tweede plaats.';
    elements.checkAnswer.textContent = '✓ Correct';
    if (!state.progress.wordOrderCompleted) {
      state.progress.wordOrderCompleted = true;
      state.progress.completed += 1;
      state.progress.minutes = Math.max(8, state.progress.minutes);
      saveProgress();
    }
    speak('Goed gedaan. Vandaag werk ik thuis.', .86);
  } else {
    elements.feedback.textContent = 'Bijna. Begin met “Vandaag” en zet daarna de persoonsvorm.';
    elements.checkAnswer.textContent = 'Nog eens';
  }
}

function renderPractice(type = state.practice) {
  state.practice = type;
  state.practiceSelection = [];
  document.querySelectorAll('[data-practice]').forEach((button) => {
    const active = button.dataset.practice === type;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  if (type === 'article') {
    elements.practiceStage.innerHTML = `<div class="practice-question"><img class="visual-prompt" src="images/woord-huis.svg" alt="Een huis"><span class="kicker">Kies het lidwoord</span><h1>___ huis</h1><p>Welk lidwoord hoort bij dit woord?</p><div class="practice-choices"><button type="button" data-practice-answer="de">de</button><button type="button" data-practice-answer="het">het</button></div><p class="feedback" id="practice-feedback">Kijk naar het beeld en kies.</p></div>`;
  } else if (type === 'verb') {
    elements.practiceStage.innerHTML = `<div class="practice-question"><span class="kicker">Vervoeg het werkwoord</span><h1>Vandaag ___ ik thuis.</h1><p>Gebruik het werkwoord <strong>werken</strong>.</p><div class="practice-choices"><button type="button" data-practice-answer="werk">werk</button><button type="button" data-practice-answer="werkt">werkt</button><button type="button" data-practice-answer="werken">werken</button></div><p class="feedback" id="practice-feedback">Kies de juiste persoonsvorm.</p><button class="sound-button speak" type="button" data-text="Vandaag werk ik thuis." data-rate="0.82">🔊 Hoor de volledige zin</button></div>`;
  } else {
    elements.practiceStage.innerHTML = `<div class="practice-question"><span class="kicker">Woordvolgorde</span><h1>Begin met “Morgen”</h1><p>Zet de woorden in de juiste volgorde.</p><div class="practice-order-zone" id="practice-order-zone"><span class="placeholder">Jouw zin verschijnt hier</span></div><div class="practice-choices" id="practice-order-bank">${['Morgen', 'gaat', 'Sara', 'met de trein'].map((word) => `<button type="button" data-order-word="${word}">${word}</button>`).join('')}</div><p class="feedback" id="practice-feedback">De persoonsvorm staat op plek twee.</p><button class="primary-button" type="button" id="check-practice-order" disabled>Controleren</button></div>`;
  }
}

function updatePracticeOrder() {
  const zone = el('practice-order-zone');
  const bank = el('practice-order-bank');
  if (!zone || !bank) return;
  zone.innerHTML = state.practiceSelection.length ? state.practiceSelection.map((word, index) => `<button type="button" data-remove-order="${index}">${word}</button>`).join('') : '<span class="placeholder">Jouw zin verschijnt hier</span>';
  const all = ['Morgen', 'gaat', 'Sara', 'met de trein'];
  bank.innerHTML = remainingWords(all, state.practiceSelection).map((word) => `<button type="button" data-order-word="${word}">${word}</button>`).join('');
  el('check-practice-order').disabled = state.practiceSelection.length !== all.length;
}

function completePractice(message) {
  state.progress.practiceCompleted += 1;
  state.progress.completed += 1;
  state.progress.minutes += 3;
  saveProgress();
  showToast(message);
}

function updateProgressUI() {
  const progress = safeProgress(state.progress);
  const minutes = Math.min(progress.minutes, 20);
  elements.goalMinutes.textContent = String(minutes);
  elements.goalBar.style.width = `${completionPercentage(minutes, 20)}%`;
  elements.progressMinutes.textContent = String(progress.minutes);
  elements.progressCompleted.textContent = String(progress.completed);
  elements.progressAudio.textContent = String(progress.audioPlays);
  const skills = [
    ['Luisteren', Math.min(82, 48 + progress.audioPlays * 2), 'A2+'],
    ['Spreken', 52, 'A2'],
    ['Grammatica', Math.min(78, 55 + progress.completed * 4), 'A2+'],
    ['Woordenschat', 64, 'A2+'],
  ];
  elements.skillProgress.innerHTML = skills.map(([name, value, level]) => `<div class="skill-row"><div><span>${name}</span><b>${level}</b></div><div class="meter"><i style="width:${value}%"></i></div></div>`).join('');
}

function applyTheme(theme) {
  state.settings.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.settings.theme;
  elements.darkModeSetting.checked = state.settings.theme === 'dark';
  elements.themeToggle.textContent = state.settings.theme === 'dark' ? '☀' : '☾';
  document.querySelector('meta[name="theme-color"]').content = state.settings.theme === 'dark' ? '#0f1d1a' : '#123f38';
  saveSettings();
}

function initializeSettings() {
  applyTheme(state.settings.theme);
  elements.speechRate.value = String(state.settings.speechRate);
  elements.speechRateOutput.textContent = `${state.settings.speechRate.toFixed(2).replace(/0$/, '')}×`;
  el('open-settings').addEventListener('click', () => elements.settingsDialog.showModal());
  elements.themeToggle.addEventListener('click', () => applyTheme(state.settings.theme === 'dark' ? 'light' : 'dark'));
  elements.darkModeSetting.addEventListener('change', (event) => applyTheme(event.target.checked ? 'dark' : 'light'));
  elements.speechRate.addEventListener('input', (event) => {
    state.settings.speechRate = Number(event.target.value);
    elements.speechRateOutput.textContent = `${state.settings.speechRate.toFixed(2).replace(/0$/, '')}×`;
    saveSettings();
  });
}

function handleClick(event) {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) {
    if (pageButton.dataset.topic) {
      state.grammarTopic = pageButton.dataset.topic;
      renderGrammar();
    }
    showPage(pageButton.dataset.page);
    return;
  }
  const speechButton = event.target.closest('.speak');
  if (speechButton) { speak(speechButton.dataset.text, speechButton.dataset.rate); return; }
  const conceptButton = event.target.closest('[data-concept]');
  if (conceptButton) { state.concept = conceptButton.dataset.concept; renderConcepts(); return; }
  const conceptChild = event.target.closest('[data-concept-child]');
  if (conceptChild) { showToast(`${conceptChild.dataset.conceptChild}: deze verdiepende les staat klaar voor de volgende inhoudsronde.`); return; }
  const grammarLevel = event.target.closest('[data-grammar-level]');
  if (grammarLevel) { state.grammarLevel = grammarLevel.dataset.grammarLevel; renderGrammar(); return; }
  const grammarTopic = event.target.closest('[data-grammar-topic]');
  if (grammarTopic) { state.grammarTopic = grammarTopic.dataset.grammarTopic; renderGrammar(); return; }
  const vocabularyCategory = event.target.closest('[data-vocabulary-category]');
  if (vocabularyCategory) { state.vocabularyCategory = vocabularyCategory.dataset.vocabularyCategory; renderVocabulary(); return; }
  const listeningOption = event.target.closest('[data-listening-scene]');
  if (listeningOption) {
    const scene = listeningScenes.find((item) => item.id === listeningOption.dataset.listeningScene);
    const correct = Number(listeningOption.dataset.option) === scene.answer;
    listeningOption.parentElement.querySelectorAll('button').forEach((button, index) => button.classList.toggle('correct', index === scene.answer));
    listeningOption.classList.toggle('wrong', !correct);
    if (correct) completePractice('Goed geluisterd!');
    return;
  }
  const practiceTab = event.target.closest('[data-practice]');
  if (practiceTab) { renderPractice(practiceTab.dataset.practice); return; }
  const practiceAnswer = event.target.closest('[data-practice-answer]');
  if (practiceAnswer) {
    const expected = state.practice === 'article' ? 'het' : 'werk';
    const correct = practiceAnswer.dataset.practiceAnswer === expected;
    practiceAnswer.parentElement.querySelectorAll('button').forEach((button) => button.disabled = true);
    practiceAnswer.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) practiceAnswer.parentElement.querySelector(`[data-practice-answer="${expected}"]`)?.classList.add('correct');
    el('practice-feedback').textContent = correct ? 'Goed! Dat is correct.' : `Niet helemaal. Het juiste antwoord is “${expected}”.`;
    if (correct) completePractice('Oefening afgerond.');
    return;
  }
  const orderWord = event.target.closest('[data-order-word]');
  if (orderWord) { state.practiceSelection.push(orderWord.dataset.orderWord); updatePracticeOrder(); return; }
  const removeOrder = event.target.closest('[data-remove-order]');
  if (removeOrder) { state.practiceSelection.splice(Number(removeOrder.dataset.removeOrder), 1); updatePracticeOrder(); return; }
  if (event.target.closest('#check-practice-order')) {
    const correct = isCorrectSentence(state.practiceSelection, 'Morgen gaat Sara met de trein.');
    el('practice-feedback').textContent = correct ? 'Perfect. De persoonsvorm “gaat” staat op plek twee.' : 'Kijk opnieuw: Morgen + gaat + Sara + met de trein.';
    if (correct) completePractice('Woordvolgorde correct.');
  }
}

function initializeEvents() {
  document.addEventListener('click', handleClick);
  elements.menuButton.addEventListener('click', () => {
    const open = elements.sidebar.classList.toggle('open');
    elements.menuButton.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      elements.sidebar.classList.remove('open');
      elements.menuButton.setAttribute('aria-expanded', 'false');
    }
  });
  elements.checkAnswer.addEventListener('click', checkMainExercise);
  elements.resetExercise.addEventListener('click', () => { state.selectedWords = []; resetMainExercise(); renderMainExercise(); });
  elements.listenAnswer.addEventListener('click', () => speak(state.selectedWords.join(' ') || EXPECTED_SENTENCE));
  elements.verbSelect.addEventListener('change', (event) => renderVerbDetail(event.target.value));
  elements.speakVerb.addEventListener('click', () => speak(elements.speakVerb.dataset.text, .75));
  elements.wordSearch.addEventListener('input', (event) => { state.vocabularyQuery = event.target.value; renderVocabulary(); });
  elements.clearProgress.addEventListener('click', () => {
    state.progress = safeProgress();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Opslag kan geblokkeerd zijn. */ }
    updateProgressUI();
    showToast('De lokale voortgang is gewist.');
  });
  window.addEventListener('hashchange', () => {
    const page = location.hash.slice(1);
    if (document.querySelector(`#page-${page}`)) showPage(page, false);
  });
}

function initialize() {
  renderDashboard();
  renderLevels();
  renderConcepts();
  renderGrammar();
  renderVerbs();
  renderVocabulary();
  renderListening();
  renderMainExercise();
  renderPractice();
  updateProgressUI();
  initializeSettings();
  initializeEvents();
  loadVoices();
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;
  const hashPage = location.hash.slice(1);
  showPage(document.querySelector(`#page-${hashPage}`) ? hashPage : 'vandaag', false);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

initialize();
