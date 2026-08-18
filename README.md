# Ritual — Meditación Guiada

PWA offline con 6 meditaciones guiadas (voz + frecuencia sanadora), pensada para instalarse en tu iPhone.

## Qué incluye

- **6 rituales**: Atención Plena, Sueño Profundo, Liberar la Ansiedad, Amor Bondadoso, Escaneo Corporal, y Tu Nuevo Yo (inspirada en principios de neurociencia sobre emoción e identidad — contenido original, no un guion de terceros).
- Voz guiada con **Web Speech API** (nativa de iOS, sin costo ni API key). En Ajustes puedes elegir cuál de las voces en español de tu iPhone usar, y su velocidad.
- **Tono de frecuencia sanadora** de fondo generado en vivo con Web Audio (528Hz, 396Hz, etc.), con opción de efecto binaural si usas audífonos.
- Cada sesión dura entre ~13 y 15 minutos (hay un límite de seguridad a los 15 min por si el habla del dispositivo va más lento de lo estimado).
- 100% offline una vez instalada — no depende de ninguna API externa.

## Publicar en GitHub Pages (mismo flujo que tus otras apps)

1. Crea un repo nuevo en tu cuenta `marianatroncoso21`, por ejemplo `rituales-meditacion`.
2. Sube todos los archivos de esta carpeta (menos `make_icons.py` y este README, son solo de desarrollo) a la raíz del repo.
3. En **Settings → Pages**, selecciona la rama `main` y carpeta `/ (root)`.
4. Tu app quedará en `https://marianatroncoso21.github.io/rituales-meditacion/`.
5. Ábrela en Safari en tu iPhone → botón compartir → **Agregar a pantalla de inicio**.

## Notas técnicas importantes

- **Voces**: la primera vez que abras la app, dale un vistazo a Ajustes → Voz y prueba cuál suena más suave en tu iPhone (iOS suele incluir "Mónica", "Paulina" o "Ángela" en español). Para que suenen menos robóticas, descarga la versión "Mejorada" o "Premium" de esa voz en Ajustes del iPhone → Accesibilidad → Contenido hablado → Voces.
- **Pantalla bloqueada**: esta es la limitación más importante a tener en cuenta. La app usa Web Speech API (la síntesis de voz del navegador), y en iOS Safari **no está garantizado que la voz siga sonando si bloqueas la pantalla manualmente con el botón**, aunque el tono de fondo (que sí usa Web Audio) tiene más probabilidad de seguir. La app activa "Wake Lock" para intentar mantener la pantalla encendida mientras reproduces, pero eso no evita que tú la bloquees a propósito. Recomendación: antes de meditar, ve a Ajustes del iPhone → Pantalla y Brillo → Bloqueo Automático → "Nunca" (y bájale el brillo para cuidar la batería), y vuelve a poner el bloqueo automático normal después.
- **Pausa/reanudar**: por limitaciones de Safari con la síntesis de voz, al reanudar se repite la frase actual desde el inicio (no continúa a la mitad). Es una limitación del navegador, no un bug.
- **Efecto binaural**: solo se percibe bien con audífonos, ya que envía una frecuencia ligeramente distinta a cada oído.
- **Barra de avance/retroceso**: puedes arrastrar la barra o usar los botones de 15s para saltar. Como el audio se genera en vivo (no es un archivo), el salto es por "línea" de la meditación más cercana al segundo que elegiste, no al segundo exacto.
- **Texto completo**: el ícono de líneas (☰) arriba a la derecha del reproductor abre el guion completo de la meditación, con la línea actual resaltada y con scroll automático, similar a una vista de letras. Puedes tocar cualquier línea para saltar directo ahí.
- **Si una meditación se queda sonando solo el tono sin voz**: se agregó un mecanismo de seguridad que detecta cuando Safari deja de avisar que terminó de hablar (un bug conocido de iOS) y fuerza que continúe automáticamente. Si de todas formas se traba, usa la barra de avance para saltar manualmente.

## Próximas ideas (si quieres seguir iterando)

- Guardar un historial de sesiones completadas.
- Agregar más rituales (ej. meditación matutina, gratitud).
- Descargar el audio como archivo en vez de generarlo en vivo (requeriría un servicio de texto-a-voz externo).
