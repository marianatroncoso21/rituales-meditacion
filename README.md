# Rituales · Meditación guiada

App web de meditación guiada en español. Eliges una práctica, y una voz te acompaña paso a paso mientras suena un tono de fondo a una frecuencia determinada. Funciona sin internet y se instala en la pantalla de inicio del teléfono como una app.

**Pruébala:** https://marianatroncoso21.github.io/rituales-meditacion/

## Qué incluye

- **9 meditaciones** de entre 7 y 12 minutos, con guion propio.
- **Voz guiada** con la síntesis de voz del dispositivo (sin servidores ni costos de API).
- **Tono de fondo** generado en tiempo real, con efecto binaural opcional para audífonos.
- **Reproductor** con barra de avance, saltos de 15 segundos y anillo de progreso.
- **Texto completo** del guion, con la línea actual resaltada. Tocar una línea salta a ese punto.
- **Ajustes de voz**: elección de voz, velocidad, tono y volumen del sonido de fondo.
- **Instalable y offline** (PWA): después de la primera visita funciona sin conexión.

## Las meditaciones

| Meditación | Para qué sirve | Frecuencia |
|---|---|---|
| Atención Plena | Volver al presente observando pensamientos y sensaciones | 528 Hz |
| Sueño Profundo | Soltar el día y dormir | 174 Hz |
| Liberar la Ansiedad | Calmar el sistema nervioso con respiración y anclaje corporal | 396 Hz |
| Amor Bondadoso | Cultivar compasión hacia ti y hacia los demás (metta) | 639 Hz |
| Escaneo Corporal | Recorrer el cuerpo soltando tensión | 285 Hz |
| Sentir Desde Ahora | Practicar en presente cómo quieres sentirte, inspirada en las enseñanzas de Neville Goddard | 432 Hz |
| Manejo del Dolor | Cambiar la relación con una sensación difícil | 741 Hz |
| Desapego | Soltar el control de lo que no depende de ti | 852 Hz |
| Pensamientos Limitantes | Cuestionar creencias automáticas sin pelear con ellas | 963 Hz |

> **Nota:** las frecuencias son tonos de fondo asociados tradicionalmente al bienestar; no hay evidencia científica sólida de efectos terapéuticos. Estas meditaciones son prácticas de relajación y atención plena, no sustituyen atención médica ni psicológica.

## Instalarla en el iPhone

1. Abre el enlace de arriba en **Safari**.
2. Toca el botón de compartir y elige **Agregar a pantalla de inicio**.
3. Ábrela desde el ícono. La primera vez, hazlo con internet para que se guarde todo.

Para voces más naturales, descarga las versiones mejoradas en **Ajustes → Accesibilidad → Contenido hablado → Voces → Español**. Luego, dentro de la app, en Ajustes → Voz, toca "Actualizar lista de voces".

## Cómo está hecha

HTML, CSS y JavaScript sin dependencias ni proceso de build.

- **Voz:** Web Speech API (`speechSynthesis`).
- **Tono de fondo:** Web Audio API, con dos osciladores sinusoidales (uno por oído; en modo binaural el derecho suena 6 Hz más agudo).
- **Offline:** Service Worker con caché de los archivos de la app.
- **Pantalla encendida:** Screen Wake Lock durante la sesión.

```
index.html          Estructura de las pantallas
style.css           Estilos (tema oscuro tipo galaxia)
app.js              Reproductor, voz, audio y ajustes
data.js             Guiones y frecuencia de cada meditación
service-worker.js   Caché para uso sin conexión
manifest.json       Configuración de la PWA
icons/              Íconos de la app
```

Para agregar una meditación, añade un objeto a la lista de `data.js` con su título, frecuencia, color y los fragmentos del guion (`t` es el texto y `p` los segundos de pausa después).

Para probarla en tu computadora, sirve la carpeta con cualquier servidor estático, por ejemplo `python3 -m http.server`, y abre `localhost:8000`.

## Limitaciones conocidas (iOS / Safari)

- Si bloqueas el teléfono con el botón lateral, iOS puede pausar la voz. Lo más estable es dejar la pantalla encendida durante la sesión.
- Al pausar y reanudar, Safari repite la frase actual desde el inicio.
- La calidad de la voz depende de las voces instaladas en el dispositivo; suena más natural con las versiones mejoradas.
- Si no se escucha el tono, usa **Ajustes → Probar tono** o activa el **modo compatibilidad de audio**.

## Ideas pendientes

- Voces pregrabadas de mayor calidad en lugar de la síntesis del sistema.
- Historial de sesiones completadas.
- Más meditaciones.
