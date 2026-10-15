const CONFIG = window.AFTERGLOW_CONFIG;

const GATEWAY =
  CONFIG?.gatewayUrl ||
  "https://wttkmkrzdkeqidjxllrs.supabase.co/functions/v1/afterglow-gateway-v2";

const BUCKET = CONFIG?.bucketName || "afterglow";
const $ = (id) => document.getElementById(id);

const INTRO_DURATION = 38000;
const INTRO_MUSIC_PATH = "./afterglow-intro-music.mp3";

let currentUser = null;
let isOwner = false;
let introStarted = false;
let introFinished = false;
let introStartTime = 0;
let introTimer = null;
let sceneTimer = null;
let introAudio = null;
let introAnimationFrame = null;
let currentScene = 0;

const MUSIC_PLAYLIST = [
  {
    title: "Afterglow",
    src: "./afterglow-intro-music.mp3"
  }
];

let musicAudio = null;
let musicIndex = 0;
let musicEnabled = true;

/* ----------------------------------
   GENERAL HELPERS
---------------------------------- */

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value ?? "";
}

function showElement(id) {
  const element = $(id);
  if (element) element.hidden = false;
}

function hideElement(id) {
  const element = $(id);
  if (element) element.hidden = true;
}

function setStatus(message) {
  const status = $("statusMessage");
  if (status) status.textContent = message;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* ----------------------------------
   DREAMY GALAXY INTRO
---------------------------------- */

function getIntroScenes() {
  return [
    {
      title: "Some memories never fade",
      text: "Somewhere between the stars, a story remains."
    },
    {
      title: "A little piece of forever",
      text: "Not every beautiful thing needs to be explained."
    },
    {
      title: "Across the quiet universe",
      text: "Even silence can hold a thousand memories."
    },
    {
      title: "Written in starlight",
      text: "Some moments stay long after they pass."
    },
    {
      title: "A world of our own",
      text: "A little universe hidden away from time."
    },
    {
      title: "Every photograph has a story",
      text: "Every detail keeps a moment alive."
    },
    {
      title: "Between yesterday and tomorrow",
      text: "There are memories we carry with us."
    },
    {
      title: "A thousand little feelings",
      text: "Some things are felt more deeply than words."
    },
    {
      title: "Under the same stars",
      text: "Some memories always find their way home."
    },
    {
      title: "Let time slow down",
      text: "Stay for a moment. There is no rush."
    },
    {
      title: "Welcome to Afterglow",
      text: "Where moments become memories, and memories remain."
    },
    {
      title: "The story begins",
      text: "Step inside."
    }
  ];
}

function createIntroAudio() {
  if (introAudio) return introAudio;

  introAudio = new Audio(INTRO_MUSIC_PATH);
  introAudio.preload = "auto";
  introAudio.loop = false;
  introAudio.volume = 0.75;

  introAudio.addEventListener("error", () => {
    console.error("Intro music could not be loaded:", INTRO_MUSIC_PATH);
  });

  return introAudio;
}

function showScene(index) {
  const scenes = getIntroScenes();
  const scene = scenes[index];

  if (!scene) return;

  currentScene = index;

  const title = $("introTitle");
  const text = $("introText");

  if (title) {
    title.classList.remove("scene-visible");
    title.textContent = scene.title;
    void title.offsetWidth;
    title.classList.add("scene-visible");
  }

  if (text) {
    text.classList.remove("scene-visible");
    text.textContent = scene.text;
    void text.offsetWidth;
    text.classList.add("scene-visible");
  }

  const progress = $("introProgress");
  if (progress) {
    progress.style.width =
      `${((index + 1) / scenes.length) * 100}%`;
  }
}

function syncScene() {
  if (!introStarted || introFinished) return;

  const elapsed = performance.now() - introStartTime;
  const scenes = getIntroScenes();
  const sceneDuration = INTRO_DURATION / scenes.length;

  const sceneIndex = Math.min(
    scenes.length - 1,
    Math.floor(elapsed / sceneDuration)
  );

  if (sceneIndex !== currentScene) {
    showScene(sceneIndex);
  }

  if (elapsed >= INTRO_DURATION) {
    finishIntro();
    return;
  }

  introAnimationFrame = requestAnimationFrame(syncScene);
}

function startIntro() {
  if (introStarted) return;

  introStarted = true;
  introFinished = false;
  introStartTime = performance.now();

  const intro = $("intro");
  if (intro) {
    intro.hidden = false;
    intro.classList.add("is-active");
  }

  document.body.classList.add("intro-playing");

  const progress = $("introProgress");
  if (progress) {
    progress.style.transition = "none";
    progress.style.width = "0%";

    requestAnimationFrame(() => {
      progress.style.transition =
        `width ${INTRO_DURATION}ms linear`;
      progress.style.width = "100%";
    });
  }

  showScene(0);

  const audio = createIntroAudio();

  audio.currentTime = 0;
  audio.play().catch((error) => {
    console.warn("Intro music autoplay was blocked:", error);
  });

  clearTimeout(introTimer);
  introTimer = setTimeout(finishIntro, INTRO_DURATION);

  cancelAnimationFrame(introAnimationFrame);
  introAnimationFrame = requestAnimationFrame(syncScene);
}

function finishIntro() {
  if (introFinished) return;

  introFinished = true;

  clearTimeout(introTimer);
  clearTimeout(sceneTimer);
  cancelAnimationFrame(introAnimationFrame);

  if (introAudio) {
    introAudio.pause();
    introAudio.currentTime = 0;
  }

  const intro = $("intro");
  if (intro) {
    intro.classList.remove("is-active");
    intro.classList.add("intro-finished");

    setTimeout(() => {
      intro.hidden = true;
      intro.classList.remove("intro-finished");
    }, 900);
  }

  document.body.classList.remove("intro-playing");

  const app = $("app");
  if (app) {
    app.hidden = false;
    app.classList.add("app-visible");
  }

  setupMusicPlayer();
}

/* ----------------------------------
   MUSIC PLAYER
---------------------------------- */

function setupMusicPlayer() {
  const button =
    $("musicButton") ||
    $("musicToggle") ||
    $("musicBtn");

  if (!button) return;

  if (!musicAudio) {
    musicAudio = new Audio();
    musicAudio.loop = false;
    musicAudio.volume = 0.55;

    musicAudio.addEventListener("ended", () => {
      musicIndex = (musicIndex + 1) % MUSIC_PLAYLIST.length;
      loadPlaylistTrack();
      if (musicEnabled) {
        musicAudio.play().catch(() => {});
      }
    });
  }

  if (!button.dataset.afterglowBound) {
    button.dataset.afterglowBound = "true";

    button.addEventListener("click", () => {
      if (!musicAudio.src || musicAudio.paused) {
        musicEnabled = true;
        loadPlaylistTrack();

        musicAudio.play().then(() => {
          updateMusicButton(button, true);
        }).catch(() => {
          updateMusicButton(button, false);
        });
      } else {
        musicEnabled = false;
        musicAudio.pause();
        updateMusicButton(button, false);
      }
    });
  }

  loadPlaylistTrack();
  updateMusicButton(button, false);
}

function loadPlaylistTrack() {
  if (!musicAudio || !MUSIC_PLAYLIST.length) return;

  const track = MUSIC_PLAYLIST[musicIndex];

  if (!track) return;

  if (!musicAudio.src.endsWith(track.src)) {
    musicAudio.src = track.src;
    musicAudio.load();
  }

  const title = $("musicTitle");
  if (title) title.textContent = track.title;
}

function updateMusicButton(button, playing) {
  button.setAttribute("aria-pressed", String(playing));
  button.title = playing ? "Pause music" : "Play music";

  const label = button.querySelector(".music-label");
  if (label) {
    label.textContent = playing ? "Pause" : "Play";
  }
}

/* ----------------------------------
   SHARED-PASSWORD GATEWAY
---------------------------------- */

async function gatewayRequest(action, data = {}) {
  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      ...data
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || result.message || "Request failed."
    );
  }

  return result;
}

async function verifyPassword(password) {
  return gatewayRequest("verify", { password });
}

async function handlePasswordSubmit(event) {
  if (event) event.preventDefault();

  const input =
    $("passwordInput") ||
    $("ownerPassword") ||
    $("password");

  const password = input?.value?.trim();

  if (!password) {
    setStatus("Please enter the password.");
    return;
  }

  setStatus("Unlocking Afterglow...");

  try {
    const result = await verifyPassword(password);

    if (!result || result.success !== true) {
      setStatus("Incorrect password. Try again.");
      return;
    }

    currentUser = result.ownerId || "owner";
    isOwner = result.isOwner === true;

    hideElement("passwordScreen");
    hideElement("loginScreen");

    const app = $("app");
    if (app) app.hidden = true;

    startIntro();
    await loadMemories();
  } catch (error) {
    console.error("Password verification failed:", error);
    setStatus("Could not unlock. Check your connection and gateway.");
  }
}

/* ----------------------------------
   MEMORIES GALLERY
---------------------------------- */

async function loadMemories() {
  try {
    const result = await gatewayRequest("list");

    const memories = Array.isArray(result.memories)
      ? result.memories
      : [];

    renderMemories(memories);
  } catch (error) {
    console.error("Could not load memories:", error);
    setStatus("Memories could not be loaded.");
  }
}

function renderMemories(memories) {
  const gallery =
    $("memories") ||
    $("memoryGallery") ||
    $("gallery");

  if (!gallery) return;

  gallery.replaceChildren();

  memories.forEach((memory) => {
    const card = document.createElement("article");
    card.className = "memory-card";

    const title = document.createElement("h2");
    title.textContent = memory.title || "Untitled memory";
    card.appendChild(title);

    if (memory.image_url) {
      const image = document.createElement("img");
      image.src = memory.image_url;
      image.alt = memory.title || "Memory";
      image.loading = "lazy";
      card.appendChild(image);
    }

    const body = document.createElement("p");
    body.textContent = memory.body || "";
    card.appendChild(body);

    if (isOwner) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        openMemoryEditor(memory);
      });
      card.appendChild(editButton);
    }

    gallery.appendChild(card);
  });
}

/* ----------------------------------
   OWNER EDITOR
---------------------------------- */

function openMemoryEditor(memory = {}) {
  if (!isOwner) return;

  const editor = $("memoryEditor");
  if (!editor) return;

  const idInput = $("memoryId");
  const titleInput = $("memoryTitle");
  const bodyInput = $("memoryBody");

  if (idInput) idInput.value = memory.id ?? "";
  if (titleInput) titleInput.value = memory.title ?? "";
  if (bodyInput) bodyInput.value = memory.body ?? "";

  editor.hidden = false;
}

async function saveMemory(event) {
  if (event) event.preventDefault();

  if (!isOwner) {
    setStatus("Owner access is required.");
    return;
  }

  const id = $("memoryId")?.value;
  const title = $("memoryTitle")?.value?.trim() || "";
  const body = $("memoryBody")?.value?.trim() || "";
  const image = $("memoryImage")?.files?.[0];

  if (!id) {
    setStatus("Memory ID is missing.");
    return;
  }

  if (image && image.size > 5 * 1024 * 1024) {
    setStatus("Choose an image smaller than 5 MB.");
    return;
  }

  setStatus("Saving memory...");

  try {
    let imageData = null;

    if (image) {
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(
          new Error("Could not read the image.")
        );

        reader.readAsDataURL(image);
      });

      imageData = {
        name: image.name,
        type: image.type,
        data: encoded
      };
    }

    await gatewayRequest("save", {
      id: Number(id),
      title,
      body,
      image: imageData
    });

    const editor = $("memoryEditor");
    if (editor) editor.hidden = true;

    setStatus("Memory saved.");
    await loadMemories();
  } catch (error) {
    console.error("Saving memory failed:", error);
    setStatus("Could not save. Check the gateway configuration.");
  }
}

/* ----------------------------------
   INITIALIZATION
---------------------------------- */

function bindEvents() {
  const passwordForm =
    $("passwordForm") ||
    $("loginForm");

  if (passwordForm && !passwordForm.dataset.bound) {
    passwordForm.dataset.bound = "true";
    passwordForm.addEventListener(
      "submit",
      handlePasswordSubmit
    );
  }

  const saveForm =
    $("memoryForm") ||
    $("editMemoryForm");

  if (saveForm && !saveForm.dataset.bound) {
    saveForm.dataset.bound = "true";
    saveForm.addEventListener("submit", saveMemory);
  }

  const cancelButton = $("cancelEdit");

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      hideElement("memoryEditor");
    });
  }
}

function initializeAfterglow() {
  bindEvents();

  const app = $("app");
  if (app) app.hidden = true;

  const intro = $("intro");
  if (intro) intro.hidden = true;

  const passwordScreen =
    $("passwordScreen") ||
    $("loginScreen");

  if (passwordScreen) {
    passwordScreen.hidden = false;
  }

  createIntroAudio();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeAfterglow
  );
} else {
  initializeAfterglow();
  }
