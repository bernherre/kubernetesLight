# Audio heredado

Los archivos WAV de esta carpeta pertenecen a la primera versión del repositorio.

No se cargan desde `index.html` ni desde `js/main.js`, porque parte de ese material necesita validación lingüística y técnica. Se conservan únicamente para no perder el contenido histórico y porque `reference.html` todavía puede referenciar algunos de ellos.

La aplicación principal utiliza texto neerlandés controlado con `SpeechSynthesisUtterance` y `lang = "nl-NL"`.

Antes de reutilizar un WAV en la nueva experiencia se debe comprobar:

- correspondencia exacta entre texto y sonido;
- pronunciación neerlandesa real;
- velocidad y claridad;
- ausencia de cortes o ruido;
- licencia y procedencia del audio.
