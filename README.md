# Rituales — Meditación Guiada

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

- **Voces**: la primera vez que abras la app, dale un vistazo a Ajustes → Voz y prueba cuál suena más suave en tu iPhone (iOS suele incluir "Mónica", "Paulina" o "Ángela" en español).
- **Pantalla bloqueada**: iOS puede pausar la síntesis de voz si el teléfono se bloquea o cambias de app. La app pide mantener la pantalla encendida (Wake Lock) mientras reproduces, pero es buena idea no cambiar de app durante la meditación.
- **Pausa/reanudar**: por limitaciones de Safari con la síntesis de voz, al reanudar se repite la frase actual desde el inicio (no continúa a la mitad). Es una limitación del navegador, no un bug.
- **Efecto binaural**: solo se percibe bien con audífonos, ya que envía una frecuencia ligeramente distinta a cada oído.

## Próximas ideas (si quieres seguir iterando)

- Guardar un historial de sesiones completadas.
- Agregar más rituales (ej. meditación matutina, gratitud).
- Descargar el audio como archivo en vez de generarlo en vivo (requeriría un servicio de texto-a-voz externo).


