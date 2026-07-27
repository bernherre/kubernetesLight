import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
async function read(path) { return readFile(new URL(path, root), 'utf8'); }

test('de startpagina is Nederlandstalig en werkt ook via dubbelklik', async () => {
  const html = await read('index.html');
  assert.match(html, /<html lang="nl"/);
  assert.match(html, /css\/styles\.css/);
  assert.match(html, /<script src="js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /images\/concept-map\.svg/);
});

test('de hoofdapp gebruikt geen twijfelachtige WAV-opnames', async () => {
  const html = await read('index.html');
  const main = await read('js/main.js');
  const app = await read('js/app.js');
  assert.doesNotMatch(html, /audio\/.*\.wav/i);
  assert.doesNotMatch(main, /audio\/.*\.wav/i);
  assert.match(main, /utterance\.lang = 'nl-NL'/);
  assert.match(app, /utterance\.lang = 'nl-NL'/);
  assert.match(html, /Normaal/);
  assert.match(html, /Langzaam/);
});

test('de inhoud bevat het leerpad A1 tot B2 en alle kerndomeinen', async () => {
  const content = await read('js/content.js');
  for (const level of ['A1', 'A2', 'B1', 'B2']) assert.match(content, new RegExp(`id: '${level}'`));
  for (const domain of ['Grammatica', 'Werkwoorden', 'Semantiek', 'Woordenschat', 'Uitspraak', 'Communicatie']) assert.match(content, new RegExp(domain));
});

test('het oorspronkelijke naslagwerk blijft beschikbaar maar is niet de hoofdapp', async () => {
  const reference = await read('reference.html');
  const html = await read('index.html');
  assert.match(reference, /Capítulo 1/);
  assert.match(reference, /css\/reference\.css/);
  assert.match(html, /Oorspronkelijk naslagwerk/);
});

test('GitHub Pages voert tests uit voor de deployment', async () => {
  const workflow = await read('.github/workflows/deploy-pages.yml');
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test('alle lokale src- en href-assets op de startpagina bestaan', async () => {
  const html = await read('index.html');
  const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith('http') && !value.startsWith('mailto:'));
  for (const reference of references) await assert.doesNotReject(readFile(new URL(reference, root)));
});

test('alle inhoudsafbeeldingen bestaan en hebben alternatieve tekst in de app', async () => {
  const content = await read('js/content.js');
  const imageReferences = [...content.matchAll(/(?:image): '([^']+)'/g)].map((match) => match[1]);
  assert.ok(imageReferences.length >= 10);
  for (const reference of imageReferences) await assert.doesNotReject(readFile(new URL(reference, root)));
  assert.doesNotMatch(content, /alt: ''/);
});

test('de offline cache bevat de kernbestanden', async () => {
  const worker = await read('service-worker.js');
  for (const asset of ['index.html', 'css/styles.css', 'js/app.js', 'js/main.js', 'js/content.js', 'images/concept-map.svg']) assert.match(worker, new RegExp(asset.replaceAll('.', '\\.')));
});


test('de browserbundle heeft geen imports of exports nodig', async () => {
  const app = await read('js/app.js');
  assert.doesNotMatch(app, /^import\s/m);
  assert.doesNotMatch(app, /^export\s/m);
  assert.match(app, /initialize\(\);/);
});
