(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const screens = {
    home: $("#screen-home"),
    player: $("#screen-player"),
    settings: $("#screen-settings"),
  };
  function goTo(name) {
    Object.values(screens).forEach(s => s.classList.remove("screen--active"));
    screens[name].classList.add("screen--active");
  }

  // On iOS, oscillators created via Web Audio are silenced by the physical
  // mute switch by default, while SpeechSynthesis ignores it — causing the
  // healing tone to disappear while the voice keeps playing. Requesting
  // "playback" type (supported on iOS 17+) makes Web Audio behave like a
  // music app and ignore the switch too. Does nothing on browsers without it.
  if ("audioSession" in navigator) {
    try { navigator.audioSession.type = "playback"; } catch (e) {}
  }

  // ---------------------------------------------------------------
  // Preferences (persisted locally on the device only)
  // ---------------------------------------------------------------
  const prefs = Object.assign({
    voiceURI: null,
    rate: 0.84,
    pitch: 1.0,
    toneVolume: 0.09,
    binaural: true,
    toneOn: true,
  }, JSON.parse(localStorage.getItem("rituales_prefs") || "{}"));

  function savePrefs() {
    localStorage.setItem("rituales_prefs", JSON.stringify(prefs));
  }

  // ---------------------------------------------------------------
  // Duration estimate + cumulative timeline (for display and seeking)
  // ---------------------------------------------------------------
  function estimateSeconds(med, rate) {
    const wpmBase = 148; // approx spoken words/minute at rate 1.0 on iOS
    const wpm = wpmBase * rate;
    let total = 0;
    med.segments.forEach(seg => {
      const words = seg.t.trim().split(/\s+/).length;
      total += (words / wpm) * 60;
      total += seg.p;
    });
    return total;
  }
  function buildCumulative(med, rate) {
    const wpmBase = 148;
    const wpm = wpmBase * rate;
    let t = 0;
    return med.segments.map(seg => {
      const words = seg.t.trim().split(/\s+/).length;
      const speakSec = (words / wpm) * 60;
      const entry = { start: t, spokenEnd: t + speakSec, end: t + speakSec + seg.p, speakSec };
      t = entry.end;
      return entry;
    });
  }
  function segmentIndexForTime(cumulative, t) {
    for (let i = 0; i < cumulative.length; i++) {
      if (t < cumulative[i].end) return i;
    }
    return cumulative.length - 1;
  }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ---------------------------------------------------------------
  // Home list
  // ---------------------------------------------------------------
  const list = $("#ritual-list");
  MEDITATIONS.forEach(med => {
    const li = document.createElement("li");
    li.className = "ritual-item";
    li.style.color = med.color;
    const estMin = Math.round(estimateSeconds(med, prefs.rate) / 60);
    li.innerHTML = `
      <span class="ritual-dot" style="background:${med.color}"></span>
      <span class="ritual-text">
        <p class="ritual-title" style="color:var(--paper)">${med.title}</p>
        <p class="ritual-desc">${med.desc}</p>
      </span>
      <span class="ritual-freq">${med.freq} Hz<br>~${estMin} min</span>
    `;
    li.addEventListener("click", () => openPlayer(med));
    list.appendChild(li);
  });

  // ---------------------------------------------------------------
  // Voices
  // ---------------------------------------------------------------
  const voiceSelect = $("#voice-select");
  let spanishVoices = [];

  function loadVoices() {
    const all = speechSynthesis.getVoices();
    spanishVoices = all.filter(v => v.lang && v.lang.toLowerCase().startsWith("es"));
    if (spanishVoices.length === 0) spanishVoices = all; // fallback

    const femaleHints = ["mónica","monica","paulina","ángela","angela","female","mujer","carmen","conchita","lucia","lucía","marisol","soledad","isabela","paloma","maría","maria"];
    spanishVoices.sort((a, b) => {
      const aScore = femaleHints.some(h => a.name.toLowerCase().includes(h)) ? 0 : 1;
      const bScore = femaleHints.some(h => b.name.toLowerCase().includes(h)) ? 0 : 1;
      return aScore - bScore;
    });

    voiceSelect.innerHTML = "";
    spanishVoices.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });

    if (prefs.voiceURI && spanishVoices.some(v => v.voiceURI === prefs.voiceURI)) {
      voiceSelect.value = prefs.voiceURI;
    } else if (spanishVoices[0]) {
      prefs.voiceURI = spanishVoices[0].voiceURI;
      voiceSelect.value = prefs.voiceURI;
    }
  }
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  $("#btn-refresh-voices").addEventListener("click", () => {
    loadVoices();
    const btn = $("#btn-refresh-voices");
    const original = btn.textContent;
    btn.textContent = "Actualizado ✓";
    setTimeout(() => { btn.textContent = original; }, 1500);
  });

  voiceSelect.addEventListener("change", () => {
    prefs.voiceURI = voiceSelect.value;
    savePrefs();
  });

  function currentVoice() {
    return spanishVoices.find(v => v.voiceURI === prefs.voiceURI) || spanishVoices[0] || null;
  }

  const rateRange = $("#rate-range");
  rateRange.value = prefs.rate;
  rateRange.addEventListener("input", () => {
    prefs.rate = parseFloat(rateRange.value);
    savePrefs();
  });

  const pitchRange = $("#pitch-range");
  pitchRange.value = prefs.pitch;
  pitchRange.addEventListener("input", () => {
    prefs.pitch = parseFloat(pitchRange.value);
    savePrefs();
  });

  const toneVolumeRange = $("#tone-volume");
  toneVolumeRange.value = prefs.toneVolume;
  toneVolumeRange.addEventListener("input", () => {
    prefs.toneVolume = parseFloat(toneVolumeRange.value);
    if (toneGain) toneGain.gain.setTargetAtTime(prefs.toneOn ? prefs.toneVolume : 0, audioCtx.currentTime, 0.3);
    savePrefs();
  });

  const binauralToggle = $("#binaural-toggle");
  binauralToggle.checked = prefs.binaural;
  binauralToggle.addEventListener("change", () => {
    prefs.binaural = binauralToggle.checked;
    savePrefs();
  });

  $("#btn-test-voice").addEventListener("click", () => {
    speakOnce("Hola. Así sonará mi voz durante tu meditación.");
  });

  function speakOnce(text) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    const v = currentVoice();
    if (v) u.voice = v;
    u.rate = prefs.rate;
    u.pitch = prefs.pitch;
    speechSynthesis.speak(u);
  }

  // ---------------------------------------------------------------
  // Web Audio: healing-frequency tone + waveform visualizer
  // ---------------------------------------------------------------
  let audioCtx = null;
  let oscL, oscR, toneGain, analyser, merger, filter;

  function ensureAudioGraph(freq, binaural) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    stopAudioGraph();

    toneGain = audioCtx.createGain();
    toneGain.gain.value = 0;
    filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    merger = audioCtx.createChannelMerger(2);

    oscL = audioCtx.createOscillator();
    oscL.type = "sine";
    oscL.frequency.value = freq;

    oscR = audioCtx.createOscillator();
    oscR.type = "sine";
    oscR.frequency.value = binaural ? freq + 6 : freq;

    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);
    merger.connect(filter);
    filter.connect(toneGain);
    toneGain.connect(analyser);
    toneGain.connect(audioCtx.destination);

    oscL.start();
    oscR.start();

    const target = prefs.toneOn ? prefs.toneVolume : 0;
    toneGain.gain.setTargetAtTime(target, audioCtx.currentTime, 1.2);
  }

  function stopAudioGraph() {
    if (oscL) { try { oscL.stop(); } catch (e) {} oscL.disconnect(); oscL = null; }
    if (oscR) { try { oscR.stop(); } catch (e) {} oscR.disconnect(); oscR = null; }
    if (toneGain) { toneGain.disconnect(); toneGain = null; }
    if (filter) { filter.disconnect(); filter = null; }
    if (merger) { merger.disconnect(); merger = null; }
  }

  function fadeToneTo(value) {
    if (toneGain && audioCtx) toneGain.gain.setTargetAtTime(value, audioCtx.currentTime, 0.5);
  }

  const waveCanvas = $("#wave-canvas");
  const waveCtx = waveCanvas.getContext("2d");
  function drawWave() {
    const w = waveCanvas.width = waveCanvas.clientWidth * 2;
    const h = waveCanvas.height = waveCanvas.clientHeight * 2;
    waveCtx.clearRect(0, 0, w, h);
    if (!analyser) { requestAnimationFrame(drawWave); return; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    const barCount = 40;
    const step = Math.floor(data.length / barCount);
    const barW = w / barCount;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#C9A66B";
    waveCtx.fillStyle = accent.trim();
    for (let i = 0; i < barCount; i++) {
      const v = (data[i * step] - 128) / 128;
      const barH = Math.max(3, Math.abs(v) * h * 1.8);
      waveCtx.globalAlpha = 0.55 + Math.abs(v) * 0.45;
      waveCtx.fillRect(i * barW + barW * 0.25, (h - barH) / 2, barW * 0.5, barH);
    }
    requestAnimationFrame(drawWave);
  }
  drawWave();

  // ---------------------------------------------------------------
  // Wake Lock (keep screen on while playing)
  // ---------------------------------------------------------------
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) { /* not fatal */ }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.playing) requestWakeLock();
  });

  // ---------------------------------------------------------------
  // Playback engine
  // ---------------------------------------------------------------
  const SAFETY_CUTOFF = 15 * 60; // seconds — hard ceiling regardless of script length

  const state = {
    med: null,
    segIndex: 0,
    playing: false,
    elapsed: 0,
    totalEstimate: 0,
    cumulative: [],
    tickInterval: null,
    pendingTimeout: null,
    watchdogTimeout: null,
    finishing: false,
    playToken: 0, // invalidates stale callbacks after a seek/stop/pause
  };

  const playerTitle = $("#player-title");
  const playerFreq = $("#player-freq");
  const liveCaption = $("#live-caption");
  const timeElapsedEl = $("#time-elapsed");
  const timeTotalEl = $("#time-total");
  const progressFg = $("#progress-ring-fg");
  const CIRC = 2 * Math.PI * 108;
  const btnPlay = $("#btn-play");
  const iconPlay = $("#icon-play");
  const iconPause = $("#icon-pause");
  const btnToneToggle = $("#btn-tone-toggle");
  const seekBar = $("#seek-bar");
  let seeking = false;

  function openPlayer(med) {
    state.med = med;
    state.segIndex = 0;
    state.elapsed = 0;
    state.playing = false;
    state.finishing = false;
    state.playToken++;
    document.documentElement.style.setProperty("--accent", med.color);
    playerTitle.textContent = med.title;
    playerFreq.textContent = med.freqLabel;
    liveCaption.textContent = "Toca reproducir cuando estés lista.";
    state.totalEstimate = estimateSeconds(med, prefs.rate);
    state.cumulative = buildCumulative(med, prefs.rate);
    const totalCapped = Math.round(Math.min(state.totalEstimate, SAFETY_CUTOFF));
    timeTotalEl.textContent = fmt(totalCapped);
    timeElapsedEl.textContent = "00:00";
    seekBar.max = String(totalCapped);
    seekBar.value = "0";
    progressFg.style.strokeDasharray = CIRC;
    progressFg.style.strokeDashoffset = CIRC;
    setPlayIcon(false);
    document.body.classList.add("is-paused");
    buildTranscript(med);
    goTo("player");
  }

  $("#btn-back").addEventListener("click", () => { stopSession(); goTo("home"); });
  $("#btn-stop").addEventListener("click", () => { stopSession(); goTo("home"); });
  $("#btn-settings").addEventListener("click", () => goTo("settings"));
  $("#btn-settings-back").addEventListener("click", () => goTo("home"));

  btnToneToggle.addEventListener("click", () => {
    prefs.toneOn = !prefs.toneOn;
    savePrefs();
    btnToneToggle.dataset.on = String(prefs.toneOn);
    btnToneToggle.textContent = "Tono: " + (prefs.toneOn ? "activado" : "apagado");
    fadeToneTo(prefs.toneOn ? prefs.toneVolume : 0);
  });

  function setPlayIcon(isPlaying) {
    iconPlay.style.display = isPlaying ? "none" : "block";
    iconPause.style.display = isPlaying ? "block" : "none";
    document.body.classList.toggle("is-paused", !isPlaying);
  }

  btnPlay.addEventListener("click", () => {
    if (!state.playing) startOrResume();
    else pauseSession();
  });

  function startOrResume() {
    state.playing = true;
    setPlayIcon(true);
    ensureAudioGraph(state.med.freq, prefs.binaural && binauralToggle.checked);
    requestWakeLock();
    startTicker();
    speakSegment(state.segIndex);
  }

  function pauseSession() {
    state.playing = false;
    state.playToken++;
    setPlayIcon(false);
    speechSynthesis.cancel();
    clearTimeout(state.pendingTimeout);
    clearTimeout(state.watchdogTimeout);
    stopTicker();
    fadeToneTo(0);
    releaseWakeLock();
  }

  function stopSession() {
    state.playing = false;
    state.playToken++;
    speechSynthesis.cancel();
    clearTimeout(state.pendingTimeout);
    clearTimeout(state.watchdogTimeout);
    stopTicker();
    stopAudioGraph();
    releaseWakeLock();
    setPlayIcon(false);
  }

  function startTicker() {
    stopTicker();
    state.tickInterval = setInterval(() => {
      state.elapsed += 1;
      timeElapsedEl.textContent = fmt(state.elapsed);
      const cap = Math.max(1, Math.min(state.totalEstimate, SAFETY_CUTOFF));
      const pct = Math.min(1, state.elapsed / cap);
      progressFg.style.strokeDashoffset = String(CIRC * (1 - pct));
      if (!seeking) seekBar.value = String(state.elapsed);
      if (state.elapsed >= SAFETY_CUTOFF - 20 && !state.finishing) {
        state.finishing = true;
        state.segIndex = state.med.segments.length - 1;
      }
    }, 1000);
  }
  function stopTicker() { clearInterval(state.tickInterval); state.tickInterval = null; }

  // Seek bar: live-preview the time while dragging, actually seek on release.
  seekBar.addEventListener("input", () => {
    seeking = true;
    timeElapsedEl.textContent = fmt(parseInt(seekBar.value, 10));
  });
  seekBar.addEventListener("change", () => {
    performSeek(parseInt(seekBar.value, 10));
    seeking = false;
  });
  $("#btn-skip-back").addEventListener("click", () => performSeek(Math.max(0, state.elapsed - 15)));
  $("#btn-skip-fwd").addEventListener("click", () => performSeek(Math.min(parseInt(seekBar.max, 10), state.elapsed + 15)));

  function performSeek(targetSeconds) {
    if (!state.med) return;
    const idx = segmentIndexForTime(state.cumulative, targetSeconds);
    state.playToken++;
    speechSynthesis.cancel();
    clearTimeout(state.pendingTimeout);
    clearTimeout(state.watchdogTimeout);
    state.segIndex = idx;
    state.elapsed = Math.round(state.cumulative[idx].start);
    state.finishing = false;
    timeElapsedEl.textContent = fmt(state.elapsed);
    seekBar.value = String(state.elapsed);
    const cap = Math.max(1, Math.min(state.totalEstimate, SAFETY_CUTOFF));
    const pct = Math.min(1, state.elapsed / cap);
    progressFg.style.strokeDashoffset = String(CIRC * (1 - pct));
    if (state.playing) speakSegment(state.segIndex);
    else highlightTranscript(idx);
  }

  function speakSegment(i) {
    if (!state.playing) return;
    if (i >= state.med.segments.length) {
      finishSession();
      return;
    }
    const myToken = state.playToken;
    const seg = state.med.segments[i];

    liveCaption.style.opacity = 0;
    setTimeout(() => {
      if (myToken !== state.playToken) return;
      liveCaption.textContent = seg.t;
      liveCaption.style.opacity = 1;
    }, 200);
    highlightTranscript(i);

    const advance = () => {
      if (myToken !== state.playToken || !state.playing) return;
      clearTimeout(state.watchdogTimeout);
      const waitSec = state.finishing ? Math.min(seg.p, 4) : seg.p;
      state.pendingTimeout = setTimeout(() => {
        if (myToken !== state.playToken || !state.playing) return;
        state.segIndex = i + 1;
        speakSegment(state.segIndex);
      }, waitSec * 1000);
    };

    const u = new SpeechSynthesisUtterance(seg.t);
    u.lang = "es-MX";
    const v = currentVoice();
    if (v) u.voice = v;
    u.rate = prefs.rate;
    u.pitch = prefs.pitch;
    u.onend = advance;
    u.onerror = advance;
    state.liveUtterance = u; // keep a strong reference — iOS can drop GC'd utterances mid-speech
    speechSynthesis.speak(u);

    // Safety net: iOS Safari can occasionally swallow an utterance entirely
    // (no onend/onerror ever fires). If that happens, force the sequence
    // forward instead of leaving the session silently stuck.
    const words = seg.t.trim().split(/\s+/).length;
    const expectedMs = (words / (148 * prefs.rate / 60)) * 1000 * 2.5 + 6000;
    clearTimeout(state.watchdogTimeout);
    state.watchdogTimeout = setTimeout(() => {
      if (myToken !== state.playToken || !state.playing) return;
      speechSynthesis.cancel();
      advance();
    }, expectedMs);
  }

  function finishSession() {
    state.playing = false;
    setPlayIcon(false);
    liveCaption.textContent = "Sesión completa. 🌙";
    progressFg.style.strokeDashoffset = "0";
    fadeToneTo(0);
    setTimeout(stopAudioGraph, 1500);
    releaseWakeLock();
  }

  // iOS sometimes leaves speechSynthesis in a "paused" state after the tab
  // has been backgrounded; nudge it awake periodically while active.
  setInterval(() => {
    if (state.playing && speechSynthesis.paused) speechSynthesis.resume();
  }, 4000);

  // ---------------------------------------------------------------
  // Full transcript panel (Spotify-lyrics style)
  // ---------------------------------------------------------------
  const transcriptPanel = $("#transcript-panel");
  const transcriptScroll = $("#transcript-scroll");

  function buildTranscript(med) {
    transcriptScroll.innerHTML = "";
    med.segments.forEach((seg, i) => {
      const p = document.createElement("p");
      p.className = "transcript-line";
      p.dataset.index = String(i);
      p.textContent = seg.t;
      p.addEventListener("click", () => {
        const startTime = state.cumulative[i] ? state.cumulative[i].start : 0;
        performSeek(Math.round(startTime));
      });
      transcriptScroll.appendChild(p);
    });
  }
  function highlightTranscript(i) {
    transcriptScroll.querySelectorAll(".transcript-line").forEach(el => el.classList.remove("is-current"));
    const el = transcriptScroll.querySelector(`.transcript-line[data-index="${i}"]`);
    if (el) {
      el.classList.add("is-current");
      if (transcriptPanel.classList.contains("open")) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
  $("#btn-transcript-open").addEventListener("click", () => {
    if (!state.med) return;
    $("#transcript-title-text").textContent = state.med.title;
    transcriptPanel.classList.add("open");
    const current = transcriptScroll.querySelector(".transcript-line.is-current");
    if (current) setTimeout(() => current.scrollIntoView({ block: "center" }), 50);
  });
  $("#btn-transcript-close").addEventListener("click", () => transcriptPanel.classList.remove("open"));

  // ---------------------------------------------------------------
  // Service worker (offline support)
  // ---------------------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();
