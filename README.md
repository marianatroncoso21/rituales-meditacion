# Rituales — Meditación Guiada

PWA offline con 9 meditaciones guiadas (voz + frecuencia sanadora), diseño tipo galaxia.

## Qué cambió en esta versión

**Meditaciones:**
- **Salto Cuántico** (antes "Tu Nuevo Yo"): reescrita para apoyarse en ideas generales de física cuántica (el observador, la posibilidad, el salto cuántico como metáfora de cambio no-gradual), presentadas explícitamente como metáfora poética, no como enseñanza científica literal ni atribuida a ningún maestro en particular.
- **Manejo del Dolor** (nueva, 741Hz): técnica de atención plena para relacionarte distinto con una sensación difícil. Incluye una nota breve de que no sustituye atención médica — la puse en la descripción de texto bajo el nombre, no hablada dentro del audio, para no romper la inmersión.
- **Desapego** (nueva, 852Hz): soltar el control de lo que no depende de ti, sin dejar de que te importe.
- **Pensamientos Limitantes** (nueva, 963Hz): ejercicio de indagación (estilo cuestionamiento socrático) para observar creencias automáticas sin pelear con ellas.
- Los guiones de las 5 originales se mantienen con ajustes menores de tono.

**Diseño:**
- Paleta nueva: negro/espacio profundo en vez de morado, acentos dorados y tonos fríos tipo nebulosa.
- Ícono nuevo: galaxia espiral con núcleo brillante, generado a partir de tus imágenes de referencia.

**Reproductor:**
- Barra para adelantar/retroceder como en Spotify, + botones de ⏪15s / 15s⏪.
- Transcripción completa (ícono de líneas arriba a la derecha del reproductor): muestra todo el guion, resalta la línea actual y puedes tocar cualquier línea para saltar ahí.
- "Watchdog" anti-silencio: si Safari se queda muda a mitad de una frase (bug conocido de iOS), la app detecta que no avanzó y salta sola a la siguiente en vez de quedarse atorada.
- Control de tono de voz (grave/agudo) además del de velocidad, en Ajustes.
- Fix de audio en iOS: se le pide al sistema tratar el tono de fondo como "reproducción" para que no lo silencie el switch físico de silencio del iPhone.

## Sobre las voces (punto pendiente, honesto)

No tengo forma de generar audio de voz realista (tipo ElevenLabs) desde donde yo trabajo — no tengo acceso a esos servicios. Lo que sí hice fue dejar la base técnica lista: cada segmento del guion (en `data.js`) puede tener un campo opcional `audio` apuntando a un archivo mp3. Si en algún momento quieres voces más humanas:

1. Genera los audios tú misma con un servicio como ElevenLabs (tienen plan gratuito, voces en español muy naturales) — exportas cada frase o cada meditación completa como mp3.
2. Súbelos a una carpeta `audio/` en este repo.
3. Tráeme los archivos (o dime que ya están en el repo) y conecto el reproductor para que los use en vez de la voz del sistema, manteniendo el tono de fondo mezclado igual que ahora.

Mientras tanto, la mejor calidad gratuita sigue siendo descargar las voces "Mejoradas" en Ajustes → Accesibilidad → Contenido hablado → Voces → Español, y ajustar velocidad/tono en Ajustes dentro de la app.

## Publicar los cambios

Mismo flujo de siempre: descomprime este zip, entra a tu repo en GitHub, **Add file → Upload files**, arrastra todo el contenido (no la carpeta), Commit changes, espera el deploy en la pestaña Actions.

## Cambios (octubre 2026)

- **Tono binaural**: la app ahora reanuda el audio automáticamente si iOS lo interrumpe cuando empieza a hablar la voz (antes solo lo revisaba al darle play). El botón "Tono" ya refleja la preferencia guardada. En Ajustes hay un botón "Probar tono" y un "Modo compatibilidad de audio" por si el iPhone sigue sin reproducirlo.
- **"Sentir Desde Ahora"** (antes "Salto Cuántico"): reescrita desde cero, inspirada en las enseñanzas de Neville Goddard (imaginar y sentir en presente, escena breve que implica que ya es así, soltar el cómo y el cuándo).
- Caché de la app actualizado (rituales-v3) para que el iPhone cargue la versión nueva.
