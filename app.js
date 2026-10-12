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
   DREAMY GALAXY INTRO — 19 SECONDS
   ========================================= */

let introPromise = null;

function addIntroAnimationStyles() {
  if ($("afterglow-dynamic-intro-styles")) return;

  const style = document.createElement("style");
  style.id = "afterglow-dynamic-intro-styles";

  style.textContent = `
    #afterglow-intro .intro-galaxy {
      transform-origin: 50% 50%;
      will-change: transform;
    }

    #afterglow-intro.is-active .intro-progress span {
      animation: intro-progress-fill 18.1s linear forwards !important;
    }

    #afterglow-intro .intro-burst-spark {
      position: absolute;
      left: 50%;
      top: 44%;
      z-index: 4;
      display: block;
      pointer-events: none;
      color: #f7eaff;
      line-height: 1;
      will-change: transform, opacity, filter;
      text-shadow:
        0 0 7px #f3dfff,
        0 0 18px #c18aff,
        0 0 32px #a45cff;
    }

    #afterglow-intro .intro-core,
    #afterglow-intro .intro-orbit,
    #afterglow-intro .intro-star {
      will-change: transform;
    }

    @media (prefers-reduced-motion: reduce) {
      #afterglow-intro .intro-burst-spark {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function startAfterglowIntro() {
  const intro = $("afterglow-intro");
  const audio = $("afterglow-intro-music");

  if (!intro) return Promise.resolve();
  if (introPromise) return introPromise;

  addIntroAnimationStyles();

  introPromise = new Promise((resolve) => {
    let finished = false;
    let finishTimer = 0;
    let animationFrame = 0;
    let lastFrame = 0;
    let lastSparkTime = 0;
    let angle = 0;
    let startedAt = 0;

    const INTRO_DURATION = 19000;
    const FADE_DURATION = 900;
    const ACTIVE_DURATION = INTRO_DURATION - FADE_DURATION;

    const galaxy = intro.querySelector(".intro-galaxy");

    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function spinRate(elapsed) {
      const normal = 22;

      // Burst 1: 2.1–3.0 seconds.
      // Slowly accelerates, spins rapidly, then returns to normal.

      if (elapsed >= 2100 && elapsed <= 3000) {
        const progress = (elapsed - 2100) / 900;

        if (progress < 0.5) {
          const t = progress / 0.5;
          const eased = t * t * (3 - 2 * t);

          return normal + (900 - normal) * eased;
        }

        const t = (progress - 0.5) / 0.5;
        const eased = t * t * (3 - 2 * t);

        return 900 + (normal - 900) * eased;
      }

      // Burst 2: 4.5–6.0 seconds.
      // Starts fast and smoothly returns to normal.

      if (elapsed >= 4500 && elapsed <= 6000) {
        const progress = (elapsed - 4500) / 1500;
        const eased = progress * progress * (3 - 2 * progress);

        return 620 + (normal - 620) * eased;
      }

      return normal;
    }

    function isBurst(elapsed) {
      return (
        (elapsed >= 2100 && elapsed <= 3000) ||
        (elapsed >= 4500 && elapsed <= 6000)
      );
    }

    function spawnSpark(elapsed, burst) {
      if (!galaxy || reducedMotion) return;

      const spark = document.createElement("span");

      spark.className = "intro-burst-spark";
      spark.textContent = Math.random() > 0.45 ? "✦" : "✧";

      const startAngle = Math.random() * Math.PI * 2;

      const spread =
        Math.hypot(window.innerWidth, window.innerHeight) *
        (
          burst
            ? 0.36 + Math.random() * 0.48
            : 0.16 + Math.random() * 0.36
        );

      const dx = Math.cos(startAngle) * spread;
      const dy = Math.sin(startAngle) * spread;

      const size = burst
        ? 8 + Math.random() * 17
        : 6 + Math.random() * 10;

      const duration = burst
        ? 620 + Math.random() * 500
        : 800 + Math.random() * 650;

      spark.style.fontSize = `${size}px`;
      spark.style.opacity = "0";

      galaxy.appendChild(spark);

      const animation = spark.animate(
        [
          {
            transform:
              "translate(-50%, -50%) translate(0px, 0px) scale(0.15) rotate(0deg)",
            opacity: 0,
            filter: "brightness(1) blur(0px)"
          },
          {
            transform:
              `translate(-50%, -50%) translate(${dx * 0.22}px, ${dy * 0.22}px) scale(${burst ? 1.35 : 1}) rotate(80deg)`,
            opacity: burst ? 1 : 0.82,
            filter: `brightness(${burst ? 2.4 : 1.5}) blur(0px)`,
            offset: 0.28
          },
          {
            transform:
              `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.05) rotate(190deg)`,
            opacity: 0,
            filter: "brightness(1.2) blur(1px)"
          }
        ],
        {
          duration,
          easing: "cubic-bezier(0.12, 0.65, 0.25, 1)",
          fill: "forwards"
        }
      );

      animation.onfinish = () => spark.remove();

      window.setTimeout(() => spark.remove(), duration + 150);
    }

    function animateFrame(now) {
      if (finished) return;

      if (!startedAt) startedAt = now;

      const elapsed = now - startedAt;

      const dt = lastFrame
        ? Math.min(50, now - lastFrame)
        : 16;

      lastFrame = now;

      const burst = isBurst(elapsed);

      if (galaxy && !reducedMotion) {
        angle = (angle + spinRate(elapsed) * dt / 1000) % 360;

        galaxy.style.transform = `rotate(${angle}deg)`;

        // More sparks and brighter effects during both spin bursts.

        const sparkInterval = burst ? 34 : 125;

        if (now - lastSparkTime >= sparkInterval) {
          lastSparkTime = now;

          const count = burst
            ? (Math.random() > 0.5 ? 3 : 2)
            : 1;

          for (let i = 0; i < count; i++) {
            spawnSpark(elapsed, burst);
          }
        }
      }

      if (elapsed < ACTIVE_DURATION) {
        animationFrame = requestAnimationFrame(animateFrame);
      }
    }

    function finishIntro() {
      if (finished) return;

      finished = true;

      if (finishTimer) {
        window.clearTimeout(finishTimer);
      }

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      intro.classList.add("is-leaving");

      if (audio) {
        audio.pause();

        try {
          audio.currentTime = 0;
        } catch (error) {}
      }

      window.setTimeout(() => {
        intro.hidden = true;

        intro.classList.remove("is-active", "is-leaving");

        intro.setAttribute("aria-hidden", "true");

        if (galaxy) {
          galaxy.style.transform = "";
        }

        intro
          .querySelectorAll(".intro-burst-spark")
          .forEach((spark) => spark.remove());

        introPromise = null;

        resolve();
      }, FADE_DURATION);
    }

    intro.hidden = false;
    intro.setAttribute("aria-hidden", "false");

    void intro.offsetWidth;

    requestAnimationFrame((now) => {
      intro.classList.add("is-active");

      startedAt = now;
      lastFrame = now;

      animationFrame = requestAnimationFrame(animateFrame);
    });

    // Play borderline-slowed.mp3 from the beginning.

    if (audio) {
      audio.pause();

      try {
        audio.currentTime = 0;
      } catch (error) {}

      audio.volume = 0.65;

      audio.play().catch(() => {
        // The visual intro continues if audio playback fails.
      });
    }

    // 18.1 seconds of animation + 0.9-second fade = 19 seconds.

    finishTimer = window.setTimeout(
      finishIntro,
      ACTIVE_DURATION
    );
  });

  return introPromise;
}

/* =========================================
   EXISTING FLOATING MUSIC PLAYER
   ========================================= */

function setupMusicPlayer() {
  const audio = $("afterglow-music");
  const toggle = $("music-toggle");
  const playPause = $("music-play-pause");
  const next = $("music-next");
  const previous = $("music-previous");
  const details = $("music-details");
  const title = $("music-title");

  if (!audio || !toggle || !playPause || !next || !previous) {
    return;
  }

  if (audio.dataset.musicReady === "true") return;

  audio.dataset.musicReady = "true";
  audio.loop = false;
  audio.preload = "auto";
  audio.volume = 0.35;

  function updatePlaybackUI() {
    const playing = !audio.paused;

    playPause.textContent = playing ? "Ⅱ" : "▶";

    playPause.setAttribute(
      "aria-label",
      playing ? "Pause music" : "Play music"
    );

    toggle.classList.toggle("is-playing", playing);
  }

  function loadSong(index, autoplay = false) {
    if (!MUSIC_PLAYLIST.length) return;

    currentSongIndex =
      (index + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;

    const song = MUSIC_PLAYLIST[currentSongIndex];

    audio.src = song.src;

    if (title) {
      title.textContent = song.title;
    }

    audio.load();

    if (autoplay) {
      audio.play().catch(updatePlaybackUI);
    }
  }

  async function playMusic() {
    try {
      if (!audio.src) {
        loadSong(currentSongIndex, false);
      }

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

    if (details) {
      details.hidden = !musicControlsOpen;
    }

    toggle.setAttribute(
      "aria-expanded",
      String(musicControlsOpen)
    );

    toggle.setAttribute(
      "aria-label",
      musicControlsOpen
        ? "Close music controls"
        : "Open music controls"
    );

    if (musicControlsOpen && audio.paused) {
      playMusic();
    }
  }

  toggle.addEventListener("click", toggleControls);

  playPause.addEventListener("click", () => {
    if (audio.paused) {
      playMusic();
    } else {
      pauseMusic();
    }
  });

  next.addEventListener("click", () => {
    loadSong(currentSongIndex + 1, true);
  });

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

  audio.addEventListener("ended", () => {
    loadSong(currentSongIndex + 1, true);
  });

  audio.addEventListener("error", () => {
    console.warn(
      "Could not load the music file. Check the MP3 filename and repository path."
    );

    updatePlaybackUI();
  });

  loadSong(0, false);
  updatePlaybackUI();

  // Preserves your existing music-player behavior.

  playMusic();
}

/* =========================================
   DRAGGABLE MOON + SAVED POSITION + SPARKLES
   ========================================= */

function setupDraggableMusicButton() {
  const player = $("music-player");
  const button = $("music-toggle");

  if (!player || !button || button.dataset.dragReady === "true") {
    return;
  }

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

    const maxX = Math.max(
      margin,
      window.innerWidth - player.offsetWidth - margin
    );

    const maxY = Math.max(
      margin,
      window.innerHeight - player.offsetHeight - margin
    );

    return {
      x: Math.min(maxX, Math.max(margin, x)),
      y: Math.min(maxY, Math.max(margin, y))
    };
  }

  function savePosition() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          x: player.offsetLeft,
          y: player.offsetTop
        })
      );
    } catch (error) {
      console.info("Could not save the moon position.");
    }
  }

  function restorePosition() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      if (
        !saved ||
        !Number.isFinite(saved.x) ||
        !Number.isFinite(saved.y)
      ) {
        return;
      }

      const position = keepOnScreen(saved.x, saved.y);

      player.style.left = position.x + "px";
      player.style.top = position.y + "px";
      player.style.right = "auto";
      player.style.bottom = "auto";
    } catch (error) {}
  }

  function createSparkle(x, y) {
    const sparkle = document.createElement("span");

    sparkle.className = "afterglow-sparkle";
    sparkle.textContent = Math.random() > 0.5 ? "✦" : "✧";

    sparkle.style.left = x + "px";
    sparkle.style.top = y + "px";

    sparkle.style.setProperty(
      "--sparkle-x",
      Math.random() * 34 - 17 + "px"
    );

    sparkle.style.setProperty(
      "--sparkle-y",
      Math.random() * 34 - 17 + "px"
    );

    document.body.appendChild(sparkle);

    sparkle.addEventListener(
      "animationend",
      () => sparkle.remove(),
      { once: true }
    );

    window.setTimeout(() => sparkle.remove(), 900);
  }

  function createSparkleTrail(x, y) {
    const now = performance.now();

    if (now - lastSparkleTime < 45) return;

    lastSparkleTime = now;

    createSparkle(
      x + Math.random() * 14 - 7,
      y + Math.random() * 14 - 7
    );

    if (Math.random() > 0.6) {
      createSparkle(
        x + Math.random() * 22 - 11,
        y + Math.random() * 22 - 11
      );
    }
  }

  restorePosition();

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

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

    try {
      button.setPointerCapture(event.pointerId);
    } catch (error) {}

    event.preventDefault();
  });

  button.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      moved = true;
    }

    if (!moved) return;

    const position = keepOnScreen(
      originX + dx,
      originY + dy
    );

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

  button.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      suppressClick = false;
    },
    true
  );

  window.addEventListener("resize", () => {
    const rect = player.getBoundingClientRect();

    const position = keepOnScreen(
      rect.left,
      rect.top
    );

    player.style.left = position.x + "px";
    player.style.top = position.y + "px";
    player.style.right = "auto";
    player.style.bottom = "auto";

    savePosition();
  });
}

/* =========================================
   MEMORY DATA + GATEWAY REQUESTS
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
    body: JSON.stringify({
      action,
      ...data
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed (${response.status})`
    );
  }

  return result;
}

function showMessage(message, isError = false) {
  const el = $("editor-message");

  if (!el) return;

  el.textContent = message;

  el.style.color = isError
    ? "#ff9baf"
    : "#d8c0ff";
}

function setOwnerStatus(message) {
  const el = $("owner-status");

  if (el) {
    el.textContent = message;
  }
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
    <form
      id="viewer-login-form"
      style="
        width:100%;
        max-width:380px;
        padding:30px 24px;
        border:1px solid #68457d;
        border-radius:18px;
        background:#170e25;
        text-align:center;
      "
    >
      <p style="letter-spacing:4px;font-size:11px;color:#d4a8ff">
        AFTERGLOW ✦
      </p>

      <h2 style="font-family:Georgia,serif;font-size:32px;font-weight:400">
        A private <em>universe</em>
      </h2>

      <p style="color:#c7b7d2;line-height:1.7">
        Enter the viewing password to open the memory archive.
      </p>

      <input
        id="viewer-password"
        type="password"
        autocomplete="current-password"
        required
        placeholder="Viewing password"
        style="
          box-sizing:border-box;
          width:100%;
          padding:14px;
          margin:12px 0;
          border:1px solid #60416f;
          border-radius:9px;
          background:#10091d;
          color:white;
          font-size:16px;
        "
      >

      <button
        type="submit"
        style="
          width:100%;
          padding:14px;
          border:0;
          border-radius:9px;
          background:#b88be4;
          color:#160c20;
          font-weight:600;
          font-size:15px;
        "
      >
        Open memories
      </button>

      <p
        id="viewer-error"
        role="status"
        style="color:#ff9baf;font-size:13px"
      ></p>
    </form>
  `;

  document.body.appendChild(gate);

  $("viewer-login-form").addEventListener(
    "submit",
    viewerLogin
  );

  return gate;
}

function setSiteVisible(visible) {
  const gate = $("viewer-gate");

  document.querySelectorAll(
    "#particles, .site-header, main, .site-footer"
  ).forEach((el) => {
    el.hidden = !visible;
  });

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

  const button = $("viewer-login-form").querySelector(
    'button[type="submit"]'
  );

  errorEl.textContent = "Checking password…";

  if (button) {
    button.disabled = true;
  }

  try {
    const result = await request(
      "login",
      {
        mode: "view",
        password
      },
      ""
    );

    if (!result.token) {
      throw new Error(
        "The server did not return an access token."
      );
    }

    currentToken = result.token;
    currentRole = result.role || "view";

    sessionStorage.setItem(
      "afterglow_view_token",
      currentToken
    );

    sessionStorage.removeItem("afterglow_owner_token");

    // Load the gallery before the intro appears.

    await loadMemories();

    errorEl.textContent = "";
    $("viewer-password").value = "";

    setSiteVisible(true);

    // Only a successful manual viewer login triggers the intro.

    await startAfterglowIntro();

  } catch (error) {
    errorEl.textContent =
      error.message || "Could not open the archive.";
  } finally {
    if (button) {
      button.disabled = false;
    }
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

    const label = document.querySelector(
      'label[for="owner-email"]'
    );

    if (label) {
      label.hidden = true;
    }
  }

  const passwordLabel = document.querySelector(
    'label[for="owner-password"]'
  );

  if (passwordLabel) {
    passwordLabel.textContent = "Owner password";
  }

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

      setOwnerStatus(
        "Enter the owner password to manage memories."
      );
    }
  });

  $("close-modal")?.addEventListener(
    "click",
    closeOwnerModal
  );

  document.querySelectorAll("[data-close-modal]").forEach(
    (el) => {
      el.addEventListener("click", closeOwnerModal);
    }
  );

  $("logout-button")?.addEventListener(
    "click",
    ownerLogout
  );

  $("save-memory")?.addEventListener(
    "click",
    saveMemory
  );

  $("remove-image")?.addEventListener(
    "click",
    removeImage
  );

  $("memory-select")?.addEventListener(
    "change",
    chooseMemory
  );
}

async function ownerLogin(event) {
  event.preventDefault();

  const password = $("owner-password").value;
  const form = $("login-form");

  const button = form.querySelector(
    'button[type="submit"]'
  );

  if (button) {
    button.disabled = true;
  }

  setOwnerStatus("Checking owner password…");

  try {
    const result = await request(
      "login",
      {
        mode: "owner",
        password
      },
      ""
    );

    if (!result.token) {
      throw new Error(
        "The server did not return an access token."
      );
    }

    currentToken = result.token
