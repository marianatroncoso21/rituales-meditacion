(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const screens = {
    home: $("#screen-home"),
    player: $("#screen-player"),
    settings: $("#screen-settings"),
    transcript: $("#screen-transcript"),
  };
  function goTo(name) {
    Object.values(screens).forEach(s => s.classList.remove("screen--active"));
    screens[name].classList.add("screen--active");
  }

  // ---------------------------------------------------------------
  // Preferences (persisted locally on the device only)
  // ---------------------------------------------------------------
  const prefs = Object.assign({
    voiceURI: null,
    rate: 0.82,
    toneVolume: 0.09,
    binaural: true,
    toneOn: true,
  }, JSON.parse(localStorage.getItem("rituales_prefs") || "{}"));

  function savePrefs() {
    localStorage.setItem("rituales_prefs", JSON.stringify(prefs));
  }

  // ---------------------------------------------------------------
  // Timing helpers
  // ---------------------------------------------------------------
  const WPM_BASE = 148; // approx spoken words/minute at rate 1.0 on iOS

  function segSeconds(seg, rate) {
    const words = seg.t.trim().split(/\s+/).length;
    const wpm = WPM_BASE * rate;
    return (words / wpm) * 60;
  }
  function estimateSeconds(med, rate) {
    let total = 0;
    med.segments.forEach(seg => { total += segSeconds(seg, rate) + seg.p; });
    return total;
  }
  // cumulative time at which each segment STARTS
  function buildCumStarts(med, rate) {
    const starts = [];
    let t = 0;
    med.segments.forEach(seg => {
      starts.push(t);
      t += segSeconds(seg, rate) + seg.p;
    });
    return starts;
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
      <span class="ritual-dot" style="background:${med.color}; color:${med.color}"></span>
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

    const femaleHints = ["mónica","monica","paulina","ángela","angela","female","mujer","carmen","conchita","lucia","lucía","marisol","soledad","isabela","paloma","maría","maria","ester","éster"];
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
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("Hola. Así sonará mi voz durante tu meditación.");
    u.lang = "es-MX";
    const v = currentVoice();
    if (v) u.voice = v;
    u.rate = prefs.rate;
    u.pitch = 1.04;
    speechSynthesis.speak(u);
  });

  // ---------------------------------------------------------------
  // Web Audio: healing-frequency tone + waveform visualizer
  // ---------------------------------------------------------------
  // On iOS, oscillators created via Web Audio are silenced by the physical
  // mute switch by default, while SpeechSynthesis ignores it — causing the
  // tone to disappear while the voice keeps playing. Requesting "playback"
  // type (supported on iOS 17+) makes Web Audio behave like a music app and
  // ignore the switch too. Silently does nothing on browsers that lack it.
  if ("audioSession" in navigator) {
    try { navigator.audioSession.type = "playback"; } catch (e) {}
  }

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
    cumStarts: [],
    tickInterval: null,
    pendingTimeout: null,
    playToken: 0,      // invalidated on pause/stop/seek so stale callbacks are ignored
    liveUtterance: null, // kept as a strong reference — Safari can silently drop GC'd utterances
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
  const transcriptBody = $("#transcript-body");
  const transcriptTitle = $("#transcript-title");

  function openPlayer(med) {
    state.med = med;
    state.segIndex = 0;
    state.elapsed = 0;
    state.playing = false;
    state.playToken++;
    document.documentElement.style.setProperty("--accent", med.color);
    playerTitle.textContent = med.title;
    playerFreq.textContent = med.freqLabel;
    liveCaption.textContent = "Toca reproducir cuando estés lista.";
    refreshTiming();
    timeElapsedEl.textContent = "00:00";
    progressFg.style.strokeDasharray = CIRC;
    progressFg.style.strokeDashoffset = CIRC;
    setPlayIcon(false);
    document.body.classList.add("is-paused");
    buildTranscript(med);
    goTo("player");
  }

  function refreshTiming() {
    state.totalEstimate = estimateSeconds(state.med, prefs.rate);
    state.cumStarts = buildCumStarts(state.med, prefs.rate);
    const cap = Math.min(state.totalEstimate, SAFETY_CUTOFF);
    seekBar.max = String(Math.round(cap));
    timeTotalEl.textContent = "~" + fmt(cap);
    updateSeekUI();
  }

  function updateSeekUI() {
    const cap = Math.min(state.totalEstimate, SAFETY_CUTOFF) || 1;
    const pct = Math.min(1, state.elapsed / cap);
    seekBar.value = String(Math.round(state.elapsed));
    seekBar.style.setProperty("--seek-pct", (pct * 100) + "%");
    progressFg.style.strokeDashoffset = String(CIRC * (1 - pct));
    timeElapsedEl.textContent = fmt(state.elapsed);
  }

  $("#btn-back").addEventListener("click", () => { stopSession(); goTo("home"); });
  $("#btn-stop").addEventListener("click", () => { stopSession(); goTo("home"); });
  $("#btn-settings").addEventListener("click", () => goTo("settings"));
  $("#btn-settings-back").addEventListener("click", () => goTo("home"));
  $("#btn-transcript").addEventListener("click", () => {
    transcriptTitle.textContent = state.med ? state.med.title : "Texto completo";
    goTo("transcript");
    highlightTranscript(state.segIndex, true);
  });
  $("#btn-transcript-back").addEventListener("click", () => goTo("player"));

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
    stopTicker();
    fadeToneTo(0);
    releaseWakeLock();
  }

  function stopSession() {
    state.playing = false;
    state.playToken++;
    speechSynthesis.cancel();
    clearTimeout(state.pendingTimeout);
    stopTicker();
    stopAudioGraph();
    releaseWakeLock();
    setPlayIcon(false);
  }

  function startTicker() {
    stopTicker();
    state.tickInterval = setInterval(() => {
      if (!state.playing) return;
      state.elapsed += 1;
      updateSeekUI();
      highlightTranscript(state.segIndex, false);
      const cap = Math.min(state.totalEstimate, SAFETY_CUTOFF);
      if (state.elapsed >= cap) finishSession();
    }, 1000);
  }
  function stopTicker() { clearInterval(state.tickInterval); state.tickInterval = null; }

  function speakSegment(i) {
    if (!state.playing) return;
    if (i >= state.med.segments.length) { finishSession(); return; }

    const seg = state.med.segments[i];
    const token = state.playToken;

    liveCaption.style.opacity = 0;
    setTimeout(() => {
      if (state.playToken !== token) return;
      liveCaption.textContent = seg.t;
      liveCaption.style.opacity = 1;
    }, 200);
    highlightTranscript(i, false);

    const u = new SpeechSynthesisUtterance(seg.t);
    u.lang = "es-MX";
    const v = currentVoice();
    if (v) u.voice = v;
    u.rate = prefs.rate;
    u.pitch = 1.04;
    state.liveUtterance = u; // keep a strong reference so Safari doesn't GC it mid-speech

    let settled = false;
    const advance = () => {
      if (settled) return;
      settled = true;
      if (state.playToken !== token) return;
      clearTimeout(watchdog);
      state.pendingTimeout = setTimeout(() => {
        if (state.playToken !== token) return;
        state.segIndex = i + 1;
        speakSegment(state.segIndex);
      }, seg.p * 1000);
    };

    // Safety net: iOS Safari occasionally drops the onend/onerror event for
    // an utterance and the session stalls forever with only the tone playing.
    // If that happens, force the sequence forward after a generous timeout.
    const expectedMs = (segSeconds(seg, prefs.rate) * 1000) * 2.5 + 6000;
    const watchdog = setTimeout(advance, expectedMs);

    u.onend = advance;
    u.onerror = advance;
    speechSynthesis.speak(u);
  }

  function finishSession() {
    state.playing = false;
    state.playToken++;
    speechSynthesis.cancel();
    clearTimeout(state.pendingTimeout);
    stopTicker();
    setPlayIcon(false);
    liveCaption.textContent = "Sesión completa. 🌙";
    state.elapsed = Math.min(state.totalEstimate, SAFETY_CUTOFF);
    updateSeekUI();
    fadeToneTo(0);
    setTimeout(stopAudioGraph, 1500);
    releaseWakeLock();
  }

  // ---------------------------------------------------------------
  // Seeking / scrubbing
  // ---------------------------------------------------------------
  function segmentIndexForTime(t) {
    let idx = 0;
    for (let k = 0; k < state.cumStarts.length; k++) {
      if (state.cumStarts[k] <= t) idx = k; else break;
    }
    return idx;
  }

  function seekTo(targetSeconds) {
    const cap = Math.min(state.totalEstimate, SAFETY_CUTOFF);
    const t = Math.max(0, Math.min(cap, targetSeconds));
    const idx = segmentIndexForTime(t);

    state.playToken++; // invalidate anything in-flight
    speechSynthesis.cancel();
    clearTimeout(state.pendingTimeout);

    state.segIndex = idx;
    state.elapsed = Math.round(t);
    updateSeekUI();
    highlightTranscript(idx, true);

    if (state.playing) {
      speakSegment(state.segIndex);
    } else {
      liveCaption.textContent = state.med.segments[idx].t;
    }
  }

  seekBar.addEventListener("input", () => {
    // live-update visual position while dragging, without restarting speech yet
    const t = parseFloat(seekBar.value);
    const cap = Math.min(state.totalEstimate, SAFETY_CUTOFF) || 1;
    seekBar.style.setProperty("--seek-pct", (Math.min(1, t / cap) * 100) + "%");
    timeElapsedEl.textContent = fmt(t);
  });
  seekBar.addEventListener("change", () => {
    seekTo(parseFloat(seekBar.value));
  });

  $("#btn-skip-back").addEventListener("click", () => seekTo(state.elapsed - 15));
  $("#btn-skip-fwd").addEventListener("click", () => seekTo(state.elapsed + 15));

  // ---------------------------------------------------------------
  // Full transcript ("lyrics view")
  // ---------------------------------------------------------------
  let transcriptEls = [];
  function buildTranscript(med) {
    transcriptBody.innerHTML = "";
    transcriptEls = med.segments.map((seg, idx) => {
      const p = document.createElement("p");
      p.className = "transcript-line";
      p.textContent = seg.t;
      p.dataset.index = String(idx);
      p.addEventListener("click", () => {
        seekTo(state.cumStarts[idx]);
        goTo("player");
      });
      transcriptBody.appendChild(p);
      return p;
    });
  }
  function highlightTranscript(idx, forceScroll) {
    if (!transcriptEls.length) return;
    transcriptEls.forEach((el, k) => el.classList.toggle("is-current", k === idx));
    if (forceScroll || screens.transcript.classList.contains("screen--active")) {
      const el = transcriptEls[idx];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // iOS sometimes suspends speech synthesis after the tab has been
  // backgrounded; nudge it awake periodically while a session is active.
  setInterval(() => {
    if (state.playing && speechSynthesis.paused) speechSynthesis.resume();
  }, 4000);

  // ---------------------------------------------------------------
  // Service worker (offline support)
  // ---------------------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();
