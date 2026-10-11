const CONFIG = window.AFTERGLOW_CONFIG;
const GATEWAY =
  "https://wttkmkrzdkeqidjxllrs.supabase.co/functions/v1/afterglow-gateway-v2";

const BUCKET = CONFIG.bucketName || "afterglow";
const $ = (id) => document.getElementById(id);

let memories = [];
let currentToken = "";
let currentRole = "";
let selectedMemory = null;
let storageClient = null;

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

  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status})`);
  }

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
      <p style="letter-spacing:4px;font-size:11px;color:#d4a8ff">
        AFTERGLOW ✦
      </p>
      <h2 style="font-family:Georgia,serif;font-size:32px;font-weight:400">
        A private <em>universe</em>
      </h2>
      <p style="color:#c7b7d2;line-height:1.7">
        Enter the viewing password to open the memory archive.
      </p>
      <input id="viewer-password" type="password"
        autocomplete="current-password" required
        placeholder="Viewing password"
        style="box-sizing:border-box;width:100%;padding:14px;
        margin:12px 0;border:1px solid #60416f;border-radius:9px;
        background:#10091d;color:white;font-size:16px">
      <button type="submit"
        style="width:100%;padding:14px;border:0;border-radius:9px;
        background:#b88be4;color:#160c20;font-weight:600;font-size:15px">
        Open memories
      </button>
      <p id="viewer-error" role="status"
        style="color:#ff9baf;font-size:13px"></p>
    </form>
  `;

  document.body.appendChild(gate);
  $("viewer-login-form").addEventListener("submit", viewerLogin);
  return gate;
}

function setSiteVisible(visible) {
  ["particles", "site-header", "home", "memories", "footer"].forEach((id) => {
    const el = $(id);
    if (el) el.hidden = !visible;
  });

  document.querySelectorAll("main, .closing-section, .site-footer")
    .forEach((el) => {
      el.hidden = !visible;
    });

  const gate = $("viewer-gate");
  if (gate) {
    gate.hidden = visible;
    gate.style.display = visible ? "none" : "flex";
  }
}

async function viewerLogin(event) {
  event.preventDefault();

  const password = $("viewer-password").value;
  const errorEl = $("viewer-error");
  errorEl.textContent = "Checking password…";

  try {
    const result = await request("login", {
      mode: "view",
      password
    }, "");

    currentToken = result.token;
    currentRole = result.role;
    sessionStorage.setItem("afterglow_view_token", currentToken);
    sessionStorage.removeItem("afterglow_owner_token");

    setSiteVisible(true);
    errorEl.textContent = "";

    try {
      await loadMemories();
    } catch (error) {
      console.error("Could not load memories:", error);
      errorEl.textContent =
        "Password accepted, but memories could not load. Please refresh and try again.";
    }
  } catch (error) {
    errorEl.textContent = error.message || "Could not open the archive.";
  }
}

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

  if (form) {
    form.addEventListener("submit", ownerLogin);
  }

  $("owner-button")?.addEventListener("click", () => {
    $("owner-modal").classList.add("is-open");
    $("owner-modal").setAttribute("aria-hidden", "false");
    setOwnerStatus("Enter the owner password to manage memories.");
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

function closeOwnerModal() {
  $("owner-modal").classList.remove("is-open");
  $("owner-modal").setAttribute("aria-hidden", "true");
}

async function ownerLogin(event) {
  event.preventDefault();

  try {
    const result = await request("login", {
      mode: "owner",
      password: $("owner-password").value
    }, "");

    currentToken = result.token;
    currentRole = "owner";
    sessionStorage.setItem("afterglow_owner_token", currentToken);
    sessionStorage.removeItem("afterglow_view_token");

    $("owner-password").value = "";
    $("login-form").hidden = true;
    $("editor").hidden = false;

    setOwnerStatus("Owner access granted.");
    showMessage("You're signed in.");

    setSiteVisible(true);
    closeOwnerModal();

    try {
      await loadMemories();
    } catch (error) {
      console.error("Could not load memories:", error);
      showMessage("Owner login worked, but memories could not load.", true);
    }
  } catch (error) {
    setOwnerStatus(error.message || "Owner login failed.");
  }
}

function ownerLogout() {
  sessionStorage.removeItem("afterglow_owner_token");
  sessionStorage.removeItem("afterglow_view_token");

  currentToken = "";
  currentRole = "";

  $("login-form").hidden = false;
  $("editor").hidden = true;

  closeOwnerModal();
  setSiteVisible(false);
  makeGate();

  $("viewer-password").value = "";
}

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
    image.loading = "lazy";

    if (memory.image_url && /^https?:\/\//i.test(memory.image_url)) {
      image.src = memory.image_url;
      image.addEventListener("load", () => {
        placeholder.hidden = true;
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
    body.textContent =
      memory.body || "A space waiting for a memory to be written.";

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

  const index = Number(select.value);
  selectedMemory = memories[index];

  if (!selectedMemory) return;

  $("memory-title").value = selectedMemory.title || "";
  $("memory-body").value = selectedMemory.body || "";
  $("memory-image").value = "";

  showMessage("");
}

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

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Choose a JPG, PNG, WEBP, or GIF image.");
      }

      const prepared = await request("prepare_upload", {
        contentType: file.type
      });

      if (!window.supabase || !CONFIG.publishableKey) {
        throw new Error("Supabase upload client is unavailable.");
      }

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

    showMessage("Memory saved successfully.");

    await loadMemories();

    const updatedIndex = memories.findIndex(
      (memory) => String(memory.id) === String(selectedMemory.id)
    );

    if (updatedIndex >= 0) {
      $("memory-select").value = String(updatedIndex);
      chooseMemory();
    }
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

  try {
    await request("remove_image", { id: selectedMemory.id });

    selectedMemory.image_url = null;
    selectedMemory.image_path = null;

    showMessage("Photo removed from this memory.");
    await loadMemories();
  } catch (error) {
    showMessage(error.message || "Could not remove the photo.", true);
  }
}

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

  for (let i = 0; i < 55; i++) {
    particles.push(createParticle());
  }

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles.forEach((particle) => {
      particle.y -= particle.speed;

      if (particle.y < -5) {
        particle.y = window.innerHeight + 5;
        particle.x = Math.random() * window.innerWidth;
      }

      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particle.radius,
        0,
        Math.PI * 2
      );
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

async function startApp() {
  initParticles();
  setupOwnerForm();

  setSiteVisible(false);
  makeGate();

  const ownerToken = sessionStorage.getItem("afterglow_owner_token");
  const viewToken = sessionStorage.getItem("afterglow_view_token");

  for (const token of [ownerToken, viewToken]) {
    if (!token) continue;

    try {
      currentToken = token;
      await loadMemories();

      currentRole = token === ownerToken ? "owner" : "view";
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

  makeGate();
  setSiteVisible(false);
}

document.addEventListener("DOMContentLoaded", startApp);
document.documentElement.classList.add("afterglow-ready");
