# Información del proyecto

## Producto principal

`index.html` contiene la nueva experiencia **Nederlands, gewoon doen**.

Está diseñada para aprender neerlandés directamente en neerlandés mediante:

1. **beeld** — imagen y situación visual;
2. **geluid** — pronunciación neerlandesa;
3. **betekenis** — significado explicado con neerlandés claro;
4. **gebruik** — práctica y producción activa.

## Alcance actual

- Ruta A1–B2.
- Grafo de conceptos.
- Gramática y verbos.
- Vocabulario visual.
- Escenas de escucha.
- Ejercicios interactivos.
- Progreso local.
- Tema claro/oscuro.
- Uso offline básico.
- GitHub Pages con tests previos al despliegue.

## Política de audio

Los WAV de `audio/` pertenecen al repositorio anterior y **no se usan en la aplicación principal**. Algunos no estaban suficientemente validados.

La nueva interfaz utiliza textos revisados y la API de voz del navegador con idioma `nl-NL`. En dispositivos que tengan varias voces, la selección prioriza:

1. `nl-NL`;
2. `nl-BE`;
3. cualquier voz `nl-*`.

## Material anterior

`reference.html` conserva el curso antiguo para consulta histórica. No es la fuente de UX/UI ni de pronunciación de la aplicación principal.

## Desarrollo

```bash
npm run serve
npm run check
```

No se requieren dependencias de producción ni proceso de compilación.
