
const CONFIG = window.AFTERGLOW_CONFIG;

const GATEWAY =
  CONFIG?.gatewayUrl ||
  "https://wttkmkrzdkeqidjxllrs.supabase.co/functions/v1/afterglow-gateway-v2";

const BUCKET = CONFIG?.bucketName || "afterglow";
const $ = (id) => document.getElementById(id);

let memories = [];
let currentToken = "";
let currentRole = "";
let selectedMemory = null;
let storageClient = null;

const MUSIC_PLAYLIST = [
  {
    title: "Dreamy Night",
    src: "https://akihikonasa.github.io/Crimson_Phoenix/dreamy-night.mp3"
  }
];

let currentSongIndex = 0;
let musicControlsOpen = false;

/* =========================================
   AFTERGLOW CINEMATIC INTRO
   ========================================= */

let introPromise = null;
let introPlayed = false;

const INTRO_MUSIC_PATH = "assets/afterglow-intro-music.mp3";

const INTRO_SCENES = [
  { time: 0.3, text: "THE MOMENT WHERE EVERYTHING SPLITS AND VANISHES." },
  { time: 3.4, text: "YOU SEE ME JUST ONE MORE TIME." },
  { time: 6.4, text: "PLEASE EXPERIENCE WHICH YOU WILL HAVE TO FACE." },
  { time: 9.5, text: "IT HURTS BEAUTIFULLY", sub: "LIKE SPIKES OF CRYSTAL." },
  { time: 12.5, text: "ONE LAST LOOK", sub: "FRAME 001" },
  { time: 15.3, text: "ONE LAST WISH", sub: "FRAME 002" },
  { time: 18.1, text: "ONE LAST TIME", sub: "FRAME 003" },
  { time: 21.0, text: "HANABI" },
  { time: 24.0, text: "SOMETHING MEANINGFUL" },
  { time: 27.0, text: "RETROSPECT" },
  { time: 30.0, text: "— HaNaBI —" },
  { time: 33.2, text: "FRAMES OF DESTINY" }
];

function installIntroStyles() {
  if ($("afterglow-intro-styles")) return;

  const style = document.createElement("style");
  style.id = "afterglow-intro-styles";

  style.textContent = `
    #afterglow-intro {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: radial-gradient(ellipse at center,
        #38204f 0%, #180c29 48%, #080510 100%);
      color: #f5e9ff;
      font-family: Georgia, "Times New Roman", serif;
      opacity: 0;
      visibility: hidden;
      transition: opacity 1.2s ease, visibility 1.2s ease;
    }

    #afterglow-intro.ag-active {
      opacity: 1;
      visibility: visible;
    }

    #afterglow-intro.ag-leaving {
      opacity: 0;
      pointer-events: none;
    }

    #afterglow-intro .ag-nebula {
      position: absolute;
      inset: -30%;
      background:
        radial-gradient(ellipse at 30% 40%, #8d42bf66, transparent 35%),
        radial-gradient(ellipse at 70% 55%, #d84e8750, transparent 32%),
        radial-gradient(ellipse at 50% 75%, #4d4dc044, transparent 40%);
      filter: blur(35px);
      animation: agNebula 12s ease-in-out infinite alternate;
    }

    #afterglow-intro .ag-stars {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(2px 2px at 10% 20%, #fff, transparent),
        radial-gradient(1px 1px at 25% 75%, #e6caff, transparent),
        radial-gradient(2px 2px at 80% 30%, #fff, transparent),
        radial-gradient(1px 1px at 65% 80%, #ffb9e8, transparent),
        radial-gradient(1px 1px at 50% 15%, #fff, transparent),
        radial-gradient(2px 2px at 90% 65%, #c6a5ff, transparent);
      background-size: 240px 240px;
      animation: agStars 18s linear infinite;
    }

    #afterglow-intro .ag-orbit {
      position: absolute;
      width: min(75vw, 520px);
      aspect-ratio: 1;
      border: 1px solid #d4a3ff30;
      border-radius: 50%;
      box-shadow: 0 0 70px #9b4dff12, inset 0 0 70px #9b4dff10;
      animation: agOrbit 32s linear infinite;
    }

    #afterglow-intro .ag-orbit::before,
    #afterglow-intro .ag-orbit::after {
      content: "";
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f0a6d7;
      box-shadow: 0 0 18px #f0a6d7;
    }

    #afterglow-intro .ag-orbit::before {
      top: 14%;
      left: 19%;
    }

    #afterglow-intro .ag-orbit::after {
      bottom: 18%;
      right: 12%;
      background: #b58aff;
      box-shadow: 0 0 20px #b58aff;
    }

    #afterglow-intro .ag-copy {
      position: relative;
      z-index: 2;
      width: min(88vw, 760px);
      padding: 28px 18px;
      text-align: center;
    }

    #afterglow-intro .ag-line {
      margin: 0;
      font-size: clamp(19px, 4.3vw, 38px);
      font-weight: 400;
      line-height: 1.55;
      letter-spacing: clamp(2px, .7vw, 7px);
      text-transform: uppercase;
      text-shadow: 0 0 22px #cda4ff80;
      opacity: 0;
      transform: translateY(18px);
      transition: opacity .9s ease, transform 1.1s ease;
    }

    #afterglow-intro .ag-line.ag-visible {
      opacity: 1;
      transform: translateY(0);
    }

    #afterglow-intro .ag-sub {
      min-height: 18px;
      margin-top: 18px;
      color: #d8b5f5;
      font: 11px/1.6 Arial, sans-serif;
      letter-spacing: 5px;
      opacity: .9;
    }

    #afterglow-intro .ag-flash {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      background: #f5dfff;
      opacity: 0;
    }

    #afterglow-intro .ag-flash.ag-flashing {
      animation: agFlash .7s ease-out;
    }

    @keyframes agNebula {
      from { transform: translate(-3%, -2%) scale(1); }
      to { transform: translate(3%, 2%) scale(1.12); }
    }

    @keyframes agStars {
      from { transform: translateY(0); }
      to { transform: translateY(-240px); }
    }

    @keyframes agOrbit {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes agFlash {
      0% { opacity: 0; }
      18% { opacity: .18; }
      100% { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      #afterglow-intro .ag-nebula,
      #afterglow-intro .ag-stars,
      #afterglow-intro .ag-orbit {
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function getIntroAudio() {
  let audio = $("afterglow-intro-music");

  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "afterglow-intro-music";
    audio.preload = "auto";
    audio.src = INTRO_MUSIC_PATH;
    document.body.appendChild(audio);
  }

  audio.loop = false;
  audio.preload = "auto";
  return audio;
}

function startAfterglowIntro() {
  if (introPlayed) return Promise.resolve();
  if (introPromise) return introPromise;

  introPromise = new Promise(async (resolve) => {
    installIntroStyles();

    const audio = getIntroAudio();
    let finished = false;
    let animationFrame = 0;
    let sceneIndex = -1;
    let fallbackTimer = 0;

    const intro = document.createElement("section");
    intro.id = "afterglow-intro";
    intro.setAttribute("aria-label", "Afterglow cinematic intro");
    intro.setAttribute("aria-hidden", "false");

    intro.innerHTML = `
      <div class="ag-nebula"></div>
      <div class="ag-stars"></div>
      <div class="ag-orbit"></div>
      <div class="ag-copy">
        <p class="ag-line"></p>
        <div class="ag-sub"></div>
      </div>
      <div class="ag-flash"></div>
    `;

    document.body.appendChild(intro);

    const line = intro.querySelector(".ag-line");
    const sub = intro.querySelector(".ag-sub");
    const flash = intro.querySelector(".ag-flash");

    function finishIntro() {
      if (finished) return;
      finished = true;

      cancelAnimationFrame(animationFrame);
      window.clearTimeout(fallbackTimer);

      audio.removeEventListener("ended", finishIntro);
      intro.classList.add("ag-leaving");

      window.setTimeout(() => {
        intro.remove();
        introPlayed = true;
        introPromise = null;
        resolve();
      }, 1250);
    }

    function showScene(index) {
      if (index < 0 || index === sceneIndex) return;
      sceneIndex = index;

      line.classList.remove("ag-visible");
      sub.textContent = "";
      flash.classList.remove("ag-flashing");

      void line.offsetWidth;

      line.textContent = INTRO_SCENES[index].text;
      sub.textContent = INTRO_SCENES[index].sub || "";

      requestAnimationFrame(() => line.classList.add("ag-visible"));
      flash.classList.add("ag-flashing");
    }

    function syncScene() {
      if (finished) return;

      const time = Number(audio.currentTime) || 0;
      let targetIndex = -1;

      for (let i = 0; i < INTRO_SCENES.length; i++) {
        if (time >= INTRO_SCENES[i].time) targetIndex = i;
      }

      showScene(targetIndex);

      if (!audio.paused && !audio.ended) {
        animationFrame = requestAnimationFrame(syncScene);
      }
    }

    intro.classList.add("ag-active");

    audio.pause();

    try {
      audio.currentTime = 0;
    } catch (_) {}

    audio.volume = 1;

    audio.addEventListener("ended", finishIntro, { once: true });

    try {
      await audio.play();
      syncScene();
    } catch (error) {
      console.warn("Intro audio could not play:", error);
      showScene(0);
      fallbackTimer = window.setTimeout(finishIntro, 38000);
    }
  });

  return introPromise;
}

/* =========================================
   MUSIC PLAYER
   ========================================= */

function setupMusicPlayer() {
  const audio = $("afterglow-music");
  const toggle = $("music-toggle");
  const playPause = $("music-play-pause");
  const next = $("music-next");
  const previous = $("music-previous");
  const details = $("music-details");
  const title = $("music-title");

  if (!audio || !toggle || !playPause || !next || !previous) return;
  if (audio.dataset.musicReady === "true") return;

  audio.dataset.musicReady = "true";
  audio.loop = false;
  audio.preload = "auto";
  audio.volume = 0.35;

  function updatePlaybackUI() {
    const playing = !audio.paused;
    playPause.textContent = playing ? "Ⅱ" : "▶";
    playPause.setAttribute("aria-label", playing ? "Pause music" : "Play music");
    toggle.classList.toggle("is-playing", playing);
  }

  function loadSong(index, autoplay = false) {
    if (!MUSIC_PLAYLIST.length) return;

    currentSongIndex = (index + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
    const song = MUSIC_PLAYLIST[currentSongIndex];

    audio.src = song.src;
    if (title) title.textContent = song.title;
    audio.load();

    if (autoplay) {
      audio.play().catch(updatePlaybackUI);
    }
  }

  async function playMusic() {
    try {
      if (!audio.src) loadSong(currentSongIndex);
      await audio.play();
    } catch (error) {
      console.info("Tap the music button to start playback.");
    }
    updatePlaybackUI();
  }

  function pauseMusic() {
    audio.pause();
    updatePlaybackUI();
  }

  function toggleControls() {
    musicControlsOpen = !musicControlsOpen;
    if (details) details.hidden = !musicControlsOpen;

    toggle.setAttribute("aria-expanded", String(musicControlsOpen));
    toggle.setAttribute(
      "aria-label",
      musicControlsOpen ? "Close music controls" : "Open music controls"
    );

    if (musicControlsOpen && audio.paused) playMusic();
  }

  toggle.addEventListener("click", toggleControls);

  playPause.addEventListener("click", () => {
    audio.paused ? playMusic() : pauseMusic();
  });

  next.addEventListener("click", () => loadSong(currentSongIndex + 1, true));

  previous.addEventListener("click", () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      playMusic();
    } else {
      loadSong(currentSongIndex - 1, true);
    }
  });

  audio.addEventListener("play", updatePlaybackUI);
  audio.addEventListener("pause", updatePlaybackUI);
  audio.addEventListener("ended", () => loadSong(currentSongIndex + 1, true));

  audio.addEventListener("error", () => {
    console.warn("Could not load the music file. Check the MP3 path.");
    updatePlaybackUI();
  });

loadSong(0, false);
updatePlaybackUI();
}

/* =========================================
   DRAGGABLE MUSIC BUTTON
   ========================================= */

function setupDraggableMusicButton() {
  const player = $("music-player");
  const button = $("music-toggle");

  if (!player || !button || button.dataset.dragReady === "true") return;
  button.dataset.dragReady = "true";

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let suppressClick = false;
  let lastSparkleTime = 0;

  const STORAGE_KEY = "afterglow-music-position";

  function keepOnScreen(x, y) {
    const margin = 4;
    return {
      x: Math.min(Math.max(margin, x), window.innerWidth - player.offsetWidth - margin),
      y: Math.min(Math.max(margin, y), window.innerHeight - player.offsetHeight - margin)
    };
  }

  function savePosition() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        x: player.offsetLeft,
        y: player.offsetTop
      }));
    } catch (_) {}
  }

  function restorePosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;

      const position = keepOnScreen(saved.x, saved.y);
      player.style.left = position.x + "px";
      player.style.top = position.y + "px";
      player.style.right = "auto";
      player.style.bottom = "auto";
    } catch (_) {}
  }

  function createSparkle(x, y) {
    const sparkle = document.createElement("span");
    sparkle.className = "afterglow-sparkle";
    sparkle.textContent = Math.random() > 0.5 ? "✦" : "✧";
    sparkle.style.left = x + "px";
    sparkle.style.top = y + "px";
    sparkle.style.setProperty("--sparkle-x", (Math.random() * 34 - 17) + "px");
    sparkle.style.setProperty("--sparkle-y", (Math.random() * 34 - 17) + "px");
    document.body.appendChild(sparkle);
    sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
    window.setTimeout(() => sparkle.remove(), 900);
  }

  function createSparkleTrail(x, y) {
    const now = performance.now();
    if (now - lastSparkleTime < 45) return;
    lastSparkleTime = now;
    createSparkle(x + Math.random() * 14 - 7, y + Math.random() * 14 - 7);
    if (Math.random() > 0.6) {
      createSparkle(x + Math.random() * 22 - 11, y + Math.random() * 22 - 11);
    }
  }

  restorePosition();

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    dragging = true;
    moved = false;
    suppressClick = false;
    startX = event.clientX;
    startY = event.clientY;

    const rect = player.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;

    player.style.left = originX + "px";
    player.style.top = originY + "px";
    player.style.right = "auto";
    player.style.bottom = "auto";
    player.classList.add("is-dragging");

    try { button.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  });

  button.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    if (!moved) return;

    const position = keepOnScreen(originX + dx, originY + dy);
    player.style.left = position.x + "px";
    player.style.top = position.y + "px";
    createSparkleTrail(event.clientX, event.clientY);
  });

  function finishDrag() {
    if (!dragging) return;
    dragging = false;
    player.classList.remove("is-dragging");
    if (moved) {
      suppressClick = true;
      savePosition();
    }
  }

  button.addEventListener("pointerup", finishDrag);
  button.addEventListener("pointercancel", finishDrag);

  button.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);

  window.addEventListener("resize", () => {
    const rect = player.getBoundingClientRect();
    const position = keepOnScreen(rect.left, rect.top);
    player.style.left = position.x + "px";
    player.style.top = position.y + "px";
    player.style.right = "auto";
    player.style.bottom = "auto";
    savePosition();
  });
}

/* =========================================
   MEMORY DATA + GATEWAY
   ========================================= */

const defaultMemories = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  title: `Memory ${String(i + 1).padStart(2, "0")}`,
  body: "",
  image_url: null,
  image_path: null
}));

async function request(action, data = {}, token = currentToken) {
  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ action, ...data })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}

function showMessage(message, isError = false) {
  const el = $("editor-message");
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#ff9baf" : "#d8c0ff";
}

function setOwnerStatus(message) {
  const el = $("owner-status");
  if (el) el.textContent = message;
}

function openOwnerModal() {
  const modal = $("owner-modal");
  if (!modal) return;
  modal.classList.add("is-open", "open");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function closeOwnerModal() {
  const modal = $("owner-modal");
  if (!modal) return;
  modal.classList.remove("is-open", "open");
  modal.style.display = "";
  modal.setAttribute("aria-hidden", "true");
}

function makeGate() {
  let gate = $("viewer-gate");
  if (gate) return gate;

  gate = document.createElement("div");
  gate.id = "viewer-gate";

  Object.assign(gate.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "radial-gradient(ellipse at top, #28143d, #10091d 70%)",
    color: "#f8edff",
    fontFamily: "Inter, sans-serif"
  });

  gate.innerHTML = `
    <form id="viewer-login-form"
      style="width:100%;max-width:380px;padding:30px 24px;
      border:1px solid #68457d;border-radius:18px;
      background:#170e25;text-align:center">
      <p style="letter-spacing:4px;font-size:11px;color:#d4a8ff">AFTERGLOW ✦</p>
      <h2 style="font-family:Georgia,serif;font-size:32px;font-weight:400">
        A private <em>universe</em>
      </h2>
      <p style="color:#c7b7d2;line-height:1.7">
        Enter the viewing password to open the memory archive.
      </p>
      <input id="viewer-password" type="password"
        autocomplete="current-password" required placeholder="Viewing password"
        style="box-sizing:border-box;width:100%;padding:14px;margin:12px 0;
        border:1px solid #60416f;border-radius:9px;background:#10091d;
        color:white;font-size:16px">
      <button type="submit"
        style="width:100%;padding:14px;border:0;border-radius:9px;
        background:#b88be4;color:#160c20;font-weight:600;font-size:15px">
        Open memories
      </button>
      <p id="viewer-error" role="status" style="color:#ff9baf;font-size:13px"></p>
    </form>
  `;

  document.body.appendChild(gate);
  $("viewer-login-form").addEventListener("submit", viewerLogin);
  return gate;
}

function setSiteVisible(visible) {
  const gate = $("viewer-gate");

  document.querySelectorAll("#particles, .site-header, main, .site-footer")
    .forEach((el) => { el.hidden = !visible; });

  if (gate) {
    gate.hidden = visible;
    gate.style.display = visible ? "none" : "flex";
  }
}

/* =========================================
   VIEWER LOGIN + INTRO
   ========================================= */

async function viewerLogin(event) {
  event.preventDefault();

  const password = $("viewer-password").value;
  const errorEl = $("viewer-error");
  const button = $("viewer-login-form").querySelector('button[type="submit"]');

  errorEl.textContent = "Checking password…";
  if (button) button.disabled = true;

  try {
    const result = await request("login", { mode: "view", password }, "");

    if (!result.token) throw new Error("The server did not return an access token.");

    currentToken = result.token;
    currentRole = result.role || "view";

    sessionStorage.setItem("afterglow_view_token", currentToken);
    sessionStorage.removeItem("afterglow_owner_token");

    await loadMemories();

    errorEl.textContent = "";
    $("viewer-password").value = "";
    setSiteVisible(true);

    await startAfterglowIntro();
  } catch (error) {
    errorEl.textContent = error.message || "Could not open the archive.";
  } finally {
    if (button) button.disabled = false;
  }
}

/* =========================================
   OWNER LOGIN
   ========================================= */

function setupOwnerForm() {
  const form = $("login-form");
  const email = $("owner-email");

  if (email) {
    email.required = false;
    email.value = "";
    email.hidden = true;
    const label = document.querySelector('label[for="owner-email"]');
    if (label) label.hidden = true;
  }

  const passwordLabel = document.querySelector('label[for="owner-password"]');
  if (passwordLabel) passwordLabel.textContent = "Owner password";

  const password = $("owner-password");
  if (password) {
    password.autocomplete = "current-password";
    password.placeholder = "Your owner password";
  }

  form?.addEventListener("submit", ownerLogin);

  $("owner-button")?.addEventListener("click", () => {
    openOwnerModal();

    if (currentRole === "owner") {
      $("login-form").hidden = true;
      $("editor").hidden = false;
      setOwnerStatus("Owner access granted.");
    } else {
      $("login-form").hidden = false;
      $("editor").hidden = true;
      setOwnerStatus("Enter the owner password to manage memories.");
    }
  });

  $("close-modal")?.addEventListener("click", closeOwnerModal);
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeOwnerModal);
  });

  $("logout-button")?.addEventListener("click", ownerLogout);
  $("save-memory")?.addEventListener("click", saveMemory);
  $("remove-image")?.addEventListener("click", removeImage);
  $("memory-select")?.addEventListener("change", chooseMemory);
}

async function ownerLogin(event) {
  event.preventDefault();

  const password = $("owner-password").value;
  const form = $("login-form");
  const button = form.querySelector('button[type="submit"]');

  if (button) button.disabled = true;
  setOwnerStatus("Checking owner password…");

  try {
    const result = await request("login", { mode: "owner", password }, "");
    if (!result.token) throw new Error("The server did not return an access token.");

    currentToken = result.token;
    currentRole = "owner";

    sessionStorage.setItem("afterglow_owner_token", currentToken);
    sessionStorage.removeItem("afterglow_view_token");

    $("owner-password").value = "";
    form.hidden = true;
    $("editor").hidden = false;

    setOwnerStatus("Owner access granted.");
    showMessage("Loading your memories…");

    setSiteVisible(true);
    openOwnerModal();
    await loadMemories();

    showMessage("You're signed in. Your memories are ready.");
  } catch (error) {
    setOwnerStatus(error.message || "Owner login failed.");
    showMessage(error.message || "Could not load memories.", true);
  } finally {
    if (button) button.disabled = false;
  }
}

function ownerLogout() {
  sessionStorage.removeItem("afterglow_owner_token");
  sessionStorage.removeItem("afterglow_view_token");

  currentToken = "";
  currentRole = "";
  selectedMemory = null;

  $("login-form").hidden = false;
  $("editor").hidden = true;

  closeOwnerModal();
  setSiteVisible(false);
  makeGate();

  $("viewer-password").value = "";
  $("viewer-error").textContent = "";
}

/* =========================================
   MEMORY GALLERY
   ========================================= */

function normalizeMemories(rows) {
  const result = defaultMemories.map((memory) => ({ ...memory }));

  rows.forEach((row, index) => {
    const numericId = Number(row.id);
    const targetIndex =
      Number.isInteger(numericId) && numericId >= 1 && numericId <= 24
        ? numericId - 1
        : index;

    if (targetIndex >= 0 && targetIndex < 24) {
      result[targetIndex] = {
        ...result[targetIndex],
        ...row,
        image_path: row.image_path || null
      };
    }
  });

  return result;
}

async function loadMemories() {
  const result = await request("list");
  memories = normalizeMemories(result.memories || []);
  renderGallery();
  populateMemorySelect();
}

function renderGallery() {
  const gallery = $("gallery");
  if (!gallery) return;

  gallery.replaceChildren();

  memories.forEach((memory, index) => {
    const panel = document.createElement("article");
    panel.className = `memory-panel${index % 2 ? " reverse" : ""}`;

    const visual = document.createElement("div");
    visual.className = "memory-visual";

    const number = document.createElement("span");
    number.className = "memory-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const imageWrap = document.createElement("div");
    imageWrap.className = "memory-image-wrap";

    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.textContent = "✦ A moment to remember";

    const image = document.createElement("img");
    image.className = "memory-image";
    image.alt = memory.title || `Memory ${index + 1}`;
    image.loading = "eager";
    image.decoding = "async";

    if (memory.image_url && /^https?:\/\//i.test(memory.image_url)) {
      image.src = memory.image_url;
      image.addEventListener("load", () => {
        placeholder.hidden = true;
        image.hidden = false;
      });
      image.addEventListener("error", () => {
        image.hidden = true;
        placeholder.hidden = false;
      });
    } else {
      image.hidden = true;
    }

    placeholder.hidden = Boolean(memory.image_url);
    imageWrap.append(image, placeholder);
    visual.append(number, imageWrap);

    const copy = document.createElement("div");
    copy.className = "memory-copy";

    const kicker = document.createElement("p");
    kicker.className = "memory-kicker";
    kicker.textContent = `FRAGMENT ${String(index + 1).padStart(2, "0")}`;

    const title = document.createElement("h3");
    title.className = "memory-title";
    title.textContent = memory.title || `Memory ${index + 1}`;

    const divider = document.createElement("div");
    divider.className = "memory-divider";

    const body = document.createElement("p");
    body.className = "memory-body";
    body.textContent = memory.body || "A space waiting for a memory to be written.";

    copy.append(kicker, title, divider, body);
    panel.append(visual, copy);
    gallery.appendChild(panel);
  });

  const panels = gallery.querySelectorAll(".memory-panel");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    panels.forEach((panel) => observer.observe(panel));
  } else {
    panels.forEach((panel) => panel.classList.add("visible"));
  }
}

function populateMemorySelect() {
  const select = $("memory-select");
  if (!select) return;

  select.replaceChildren();

  memories.forEach((memory, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent =
      `${String(index + 1).padStart(2, "0")} — ${memory.title}`;
    select.appendChild(option);
  });

  chooseMemory();
}

function chooseMemory() {
  const select = $("memory-select");
  if (!select || !memories.length) return;

  selectedMemory = memories[Number(select.value)];
  if (!selectedMemory) return;

  $("memory-title").value = selectedMemory.title || "";
  $("memory-body").value = selectedMemory.body || "";
  $("memory-image").value = "";

  showMessage("");
}

/* =========================================
   SAVE AND REMOVE MEMORY PHOTOS
   ========================================= */

async function saveMemory() {
  if (currentRole !== "owner" || !selectedMemory) {
    showMessage("Owner access is required.", true);
    return;
  }

  const saveButton = $("save-memory");
  saveButton.disabled = true;

  try {
    let imagePath = selectedMemory.image_path || null;
    const file = $("memory-image").files[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Choose an image smaller than 5 MB.");
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Choose a JPG, PNG, WEBP, or GIF image.");
      }

      if (!CONFIG?.url || !CONFIG?.publishableKey) {
        throw new Error("Supabase configuration is incomplete.");
      }

      const prepared = await request("prepare_upload", { contentType: file.type });
      if (!prepared.path || !prepared.token) {
        throw new Error("The server did not prepare the upload.");
      }

      if (!window.supabase) throw new Error("The Supabase upload client is unavailable.");

      if (!storageClient) {
        storageClient = window.supabase.createClient(
          CONFIG.url,
          CONFIG.publishableKey
        );
      }

      const { error } = await storageClient.storage
        .from(BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;
      imagePath = prepared.path;
    }

    await request("save", {
      id: selectedMemory.id,
      title: $("memory-title").value.trim(),
      body: $("memory-body").value,
      image_path: imagePath
    });

    const savedId = selectedMemory.id;
    await loadMemories();

    const updatedIndex = memories.findIndex(
      (memory) => String(memory.id) === String(savedId)
    );

    if (updatedIndex >= 0) {
      $("memory-select").value = String(updatedIndex);
      chooseMemory();
    }

    showMessage("Memory saved successfully.");
  } catch (error) {
    showMessage(error.message || "Could not save this memory.", true);
  } finally {
    saveButton.disabled = false;
  }
}

async function removeImage() {
  if (currentRole !== "owner" || !selectedMemory) {
    showMessage("Owner access is required.", true);
    return;
  }

  const button = $("remove-image");
  button.disabled = true;

  try {
    const removedId = selectedMemory.id;
    await request("remove_image", { id: removedId });
    await loadMemories();

    const updatedIndex = memories.findIndex(
      (memory) => String(memory.id) === String(removedId)
    );

    if (updatedIndex >= 0) {
      $("memory-select").value = String(updatedIndex);
      chooseMemory();
    }

    showMessage("Photo removed from this memory.");
  } catch (error) {
    showMessage(error.message || "Could not remove the photo.", true);
  } finally {
    button.disabled = false;
  }
}

/* =========================================
   BACKGROUND PARTICLES
   ========================================= */

function initParticles() {
  const canvas = $("particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let animationId = 0;
  const particles = [];

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function createParticle() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.25 + 0.08,
      alpha: Math.random() * 0.5 + 0.15
    };
  }

  for (let i = 0; i < 55; i++) particles.push(createParticle());

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles.forEach((particle) => {
      particle.y -= particle.speed;

      if (particle.y < -5) {
        particle.y = window.innerHeight + 5;
        particle.x = Math.random() * window.innerWidth;
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(205,166,255,${particle.alpha})`;
      ctx.fill();
    });

    animationId = requestAnimationFrame(draw);
  }

  function start() {
    if (!animationId && !document.hidden) draw();
  }

  function stop() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = 0;
  }

  resize();
  start();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });
}

/* =========================================
   START AFTERGLOW
   ========================================= */

async function startApp() {
  initParticles();
  setupOwnerForm();
  setupMusicPlayer();
  setupDraggableMusicButton();


  // Do not start the background playlist automatically.
  // The intro music starts after a successful viewer login.
  setSiteVisible(false);
  makeGate();

  const ownerToken = sessionStorage.getItem("afterglow_owner_token");
  const viewToken = sessionStorage.getItem("afterglow_view_token");

  const sessions = [
    { token: ownerToken, role: "owner" },
    { token: viewToken, role: "view" }
  ];

  for (const session of sessions) {
    if (!session.token) continue;

    try {
      currentToken = session.token;
      currentRole = session.role;

      await loadMemories();
      setSiteVisible(true);

      if (currentRole === "owner") {
        $("login-form").hidden = true;
        $("editor").hidden = false;
        setOwnerStatus("Owner access restored.");
      }

      return;
    } catch (error) {
      console.error("Could not restore session:", error);
    }
  }

  currentToken = "";
  currentRole = "";

  sessionStorage.removeItem("afterglow_owner_token");
  sessionStorage.removeItem("afterglow_view_token");

  $("login-form").hidden = false;
  $("editor").hidden = true;
  setSiteVisible(false);
}

document.addEventListener("DOMContentLoaded", startApp);
document.documentElement.classList.add("afterglow-ready");
