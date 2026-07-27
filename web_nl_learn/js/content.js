export const levels = [
  {
    id: 'A1',
    title: 'De basis',
    description: 'Jezelf voorstellen, eenvoudige vragen stellen en dagelijkse woorden begrijpen.',
    progress: 100,
    modules: ['Kennismaken', 'De wereld om je heen', 'Tegenwoordige tijd', 'De en het', 'Vraagzinnen'],
  },
  {
    id: 'A2',
    title: 'Dagelijks leven',
    description: 'Vertellen wat er gebeurt, afspraken maken en situaties zelfstandig afhandelen.',
    progress: 58,
    current: true,
    modules: ['Woordvolgorde', 'Voltooide tijd', 'Scheidbare werkwoorden', 'Bij de huisarts', 'Wonen en vervoer'],
  },
  {
    id: 'B1',
    title: 'Zelfstandig Nederlands',
    description: 'Ervaringen uitleggen, professioneel schrijven en actief deelnemen aan gesprekken.',
    progress: 12,
    modules: ['Bijzinnen', 'Er en verwijswoorden', 'Werk en vergaderen', 'Mening en argumentatie', 'Formele e-mail'],
  },
  {
    id: 'B2',
    title: 'Natuurlijk en professioneel',
    description: 'Nuanceren, overtuigen en complexe onderwerpen helder bespreken.',
    progress: 0,
    modules: ['Register en stijl', 'Vaste combinaties', 'Presenteren', 'Onderhandelen', 'Complexe teksten'],
  },
];

export const concepts = [
  {
    id: 'grammatica',
    title: 'Grammatica',
    icon: '¶',
    description: 'Hoe woorden samen correcte zinnen vormen.',
    children: ['Woordsoorten', 'Zinsdelen', 'Woordvolgorde', 'Zinsconstructies'],
    related: ['werkwoorden', 'semantiek'],
  },
  {
    id: 'werkwoorden',
    title: 'Werkwoorden',
    icon: '↻',
    description: 'Acties, toestanden, tijden en vervoegingen.',
    children: ['Tegenwoordige tijd', 'Verleden tijd', 'Voltooide tijd', 'Modale werkwoorden', 'Scheidbare werkwoorden'],
    related: ['grammatica', 'communicatie'],
  },
  {
    id: 'semantiek',
    title: 'Semantiek',
    icon: '◇',
    description: 'Betekenis, context en relaties tussen woorden.',
    children: ['Synoniemen', 'Tegenstellingen', 'Collocaties', 'Uitdrukkingen', 'Betekenis in context'],
    related: ['woordenschat', 'communicatie'],
  },
  {
    id: 'woordenschat',
    title: 'Woordenschat',
    icon: '▦',
    description: 'Woorden leren met beeld, geluid en voorbeeldzinnen.',
    children: ['Mensen', 'Wonen', 'Werk', 'Gezondheid', 'Vervoer', 'Samenleving'],
    related: ['semantiek', 'uitspraak'],
  },
  {
    id: 'uitspraak',
    title: 'Uitspraak',
    icon: '◖',
    description: 'Klanken herkennen, luisteren en duidelijk spreken.',
    children: ['Klinkers', 'Medeklinkers', 'Klemtoon', 'Ritme', 'Intonatie'],
    related: ['woordenschat', 'communicatie'],
  },
  {
    id: 'communicatie',
    title: 'Communicatie',
    icon: '◎',
    description: 'Luisteren, spreken, lezen en schrijven in echte situaties.',
    children: ['Gesprekken', 'Luisteren', 'Lezen', 'Schrijven', 'Formeel en informeel'],
    related: ['semantiek', 'uitspraak'],
  },
];

export const grammarTopics = [
  {
    id: 'woordvolgorde',
    level: 'A2',
    title: 'Woordvolgorde in de hoofdzin',
    summary: 'De persoonsvorm staat meestal op de tweede plaats.',
    rule: 'Plek 1 + persoonsvorm + onderwerp + rest',
    examples: ['Ik werk vandaag thuis.', 'Vandaag werk ik thuis.', 'Morgen gaat Sara met de trein.'],
    connections: ['Inversie', 'Vraagzin', 'Bijzin', 'Tijd–manier–plaats'],
  },
  {
    id: 'de-het',
    level: 'A1',
    title: 'De en het',
    summary: 'Nederlandse zelfstandige naamwoorden hebben een lidwoord.',
    rule: 'de-woord of het-woord',
    examples: ['de fiets', 'het huis', 'de kinderen', 'het kleine boek'],
    connections: ['Meervoud', 'Aanwijzende woorden', 'Bijvoeglijk naamwoord'],
  },
  {
    id: 'perfectum',
    level: 'A2',
    title: 'De voltooide tijd',
    summary: 'Gebruik hebben of zijn met een voltooid deelwoord.',
    rule: 'onderwerp + hebben/zijn + rest + voltooid deelwoord',
    examples: ['Ik heb vandaag gewerkt.', 'Wij zijn naar huis gegaan.', 'Zij heeft de trein gemist.'],
    connections: ['Hebben of zijn', 'Voltooid deelwoord', 'Verleden tijd'],
  },
  {
    id: 'bijzin',
    level: 'B1',
    title: 'De bijzin',
    summary: 'In een bijzin gaat de persoonsvorm naar het einde.',
    rule: 'voegwoord + onderwerp + rest + persoonsvorm',
    examples: ['Ik blijf thuis omdat ik ziek ben.', 'Hij zegt dat hij morgen komt.', 'Hoewel het regent, gaan we wandelen.'],
    connections: ['Voegwoorden', 'Hoofdzin', 'Complexe zinnen'],
  },
  {
    id: 'er',
    level: 'B1',
    title: 'Het woord er',
    summary: 'Er kan een plaats, hoeveelheid of onbepaald onderwerp aanduiden.',
    rule: 'De betekenis hangt af van de functie in de zin.',
    examples: ['Er staat een fiets buiten.', 'Ik woon er al twee jaar.', 'Ik heb er drie gekocht.'],
    connections: ['Plaats', 'Hoeveelheid', 'Voorzetselvoorwerp'],
  },
  {
    id: 'register',
    level: 'B2',
    title: 'Formeel en informeel register',
    summary: 'Kies woorden en zinsbouw die bij de situatie passen.',
    rule: 'relatie + doel + kanaal bepalen je register',
    examples: ['Kun je me helpen?', 'Zou u mij hiermee kunnen helpen?', 'Wij verzoeken u de gegevens te controleren.'],
    connections: ['Beleefdheid', 'E-mail', 'Werkcontext'],
  },
];

export const verbs = [
  {
    infinitive: 'zijn', meaning: 'een toestand of identiteit hebben', auxiliary: 'zijn',
    present: ['ik ben', 'jij bent', 'hij/zij is', 'wij zijn'],
    past: ['ik was', 'jij was', 'wij waren'],
    perfect: 'ik ben geweest',
    examples: ['Ik ben thuis.', 'Gisteren was ik op kantoor.', 'Ik ben daar al eens geweest.'],
  },
  {
    infinitive: 'hebben', meaning: 'iets bezitten of ervaren', auxiliary: 'hebben',
    present: ['ik heb', 'jij hebt', 'hij/zij heeft', 'wij hebben'],
    past: ['ik had', 'jij had', 'wij hadden'],
    perfect: 'ik heb gehad',
    examples: ['Ik heb een afspraak.', 'Wij hadden weinig tijd.', 'Zij heeft geluk gehad.'],
  },
  {
    infinitive: 'werken', meaning: 'een taak of beroep uitvoeren', auxiliary: 'hebben',
    present: ['ik werk', 'jij werkt', 'hij/zij werkt', 'wij werken'],
    past: ['ik werkte', 'jij werkte', 'wij werkten'],
    perfect: 'ik heb gewerkt',
    examples: ['Ik werk vandaag thuis.', 'Hij werkte vroeger in Utrecht.', 'We hebben samen gewerkt.'],
  },
  {
    infinitive: 'gaan', meaning: 'zich naar een andere plaats bewegen', auxiliary: 'zijn',
    present: ['ik ga', 'jij gaat', 'hij/zij gaat', 'wij gaan'],
    past: ['ik ging', 'jij ging', 'wij gingen'],
    perfect: 'ik ben gegaan',
    examples: ['Wij gaan naar school.', 'Gisteren ging ik met de trein.', 'Zij is naar huis gegaan.'],
  },
  {
    infinitive: 'kunnen', meaning: 'in staat zijn of toestemming hebben', auxiliary: 'hebben',
    present: ['ik kan', 'jij kunt/kan', 'hij/zij kan', 'wij kunnen'],
    past: ['ik kon', 'jij kon', 'wij konden'],
    perfect: 'ik heb gekund',
    examples: ['Ik kan Nederlands spreken.', 'Kon je gisteren komen?', 'Dat had ik niet kunnen weten.'],
  },
  {
    infinitive: 'begrijpen', meaning: 'de betekenis van iets kennen', auxiliary: 'hebben',
    present: ['ik begrijp', 'jij begrijpt', 'hij/zij begrijpt', 'wij begrijpen'],
    past: ['ik begreep', 'jij begreep', 'wij begrepen'],
    perfect: 'ik heb begrepen',
    examples: ['Ik begrijp de vraag.', 'Wij begrepen de uitleg.', 'Heb je het goed begrepen?'],
  },
];

export const vocabulary = [
  { word: 'het huis', article: 'het', category: 'wonen', image: 'images/woord-huis.svg', alt: 'Een huis', definition: 'Een gebouw waarin mensen wonen.', example: 'Ons huis staat vlak bij een park.' },
  { word: 'de fiets', article: 'de', category: 'vervoer', image: 'images/woord-fiets.svg', alt: 'Een fiets', definition: 'Een voertuig met twee wielen en pedalen.', example: 'Ik ga met de fiets naar mijn werk.' },
  { word: 'de appel', article: 'de', category: 'eten', image: 'images/woord-appel.svg', alt: 'Een rode appel', definition: 'Een ronde vrucht die vaak rood of groen is.', example: 'Mijn dochter eet een appel.' },
  { word: 'het kantoor', article: 'het', category: 'werk', image: 'images/woord-kantoor.svg', alt: 'Een kantoor met bureau', definition: 'Een ruimte waar mensen administratief of professioneel werken.', example: 'Morgen werk ik op kantoor.' },
  { word: 'de trein', article: 'de', category: 'vervoer', image: 'images/woord-trein.svg', alt: 'Een Nederlandse trein', definition: 'Een voertuig dat over rails rijdt.', example: 'De trein naar Eindhoven vertrekt om acht uur.' },
  { word: 'de huisarts', article: 'de', category: 'gezondheid', image: 'images/woord-huisarts.svg', alt: 'Een huisarts met stethoscoop', definition: 'De arts die je meestal als eerste bezoekt.', example: 'Ik maak een afspraak bij de huisarts.' },
  { word: 'de school', article: 'de', category: 'gezin', image: 'images/woord-school.svg', alt: 'Een schoolgebouw', definition: 'Een plaats waar kinderen en volwassenen leren.', example: 'De kinderen gaan vandaag naar school.' },
  { word: 'de regen', article: 'de', category: 'weer', image: 'images/woord-regen.svg', alt: 'Regen uit een wolk', definition: 'Water dat in druppels uit de lucht valt.', example: 'Door de regen neem ik een paraplu mee.' },
  { word: 'de koffie', article: 'de', category: 'eten', image: 'images/woord-koffie.svg', alt: 'Een kop koffie', definition: 'Een warme drank die van koffiebonen wordt gemaakt.', example: 'Wil je koffie of thee?' },
];

export const listeningScenes = [
  {
    id: 'school', level: 'A1', title: 'Bij de school', image: 'images/scene-school.svg',
    intro: 'Een ouder spreekt met de leerkracht.',
    text: 'Goedemorgen. Hoe gaat het vandaag met Noor? Het gaat goed. Ze speelt graag met de andere kinderen en ze begrijpt de opdracht.',
    question: 'Met wie spreekt de ouder?', options: ['Met de huisarts', 'Met de leerkracht', 'Met een collega'], answer: 1,
  },
  {
    id: 'station', level: 'A2', title: 'Op het station', image: 'images/scene-station.svg',
    intro: 'Een reiziger vraagt informatie.',
    text: 'Pardon, vanaf welk spoor vertrekt de trein naar Utrecht? De trein vertrekt vandaag vanaf spoor vijf. U heeft nog zeven minuten.',
    question: 'Vanaf welk spoor vertrekt de trein?', options: ['Spoor drie', 'Spoor vijf', 'Spoor zeven'], answer: 1,
  },
  {
    id: 'meeting', level: 'B1', title: 'Tijdens een vergadering', image: 'images/scene-meeting.svg',
    intro: 'Collega’s bespreken een technisch project.',
    text: 'We kunnen de nieuwe datapijplijn volgende week testen, maar dan moeten de toegangsrechten uiterlijk donderdag geregeld zijn. Ik stuur vanmiddag de lijst met gebruikers.',
    question: 'Wat moet uiterlijk donderdag geregeld zijn?', options: ['De testresultaten', 'De toegangsrechten', 'De gebruikerslijst'], answer: 1,
  },
];

export const dailyPlan = [
  { label: 'Beeldwoorden', duration: 4, page: 'woordenschat' },
  { label: 'Woordvolgorde', duration: 8, page: 'les' },
  { label: 'Luistermoment', duration: 5, page: 'luisteren' },
  { label: 'Korte herhaling', duration: 3, page: 'oefenen' },
];
