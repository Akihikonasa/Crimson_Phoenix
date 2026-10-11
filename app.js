(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const gallery = $("#gallery");
  const modal = $("#owner-modal");
  const loginForm = $("#login-form");
  const editor = $("#editor");
  const ownerStatus = $("#owner-status");
  const editorMessage = $("#editor-message");
  const memorySelect = $("#memory-select");

  let supabaseClient = null;
  let memories = [];
  let currentUser = null;
  let isOwner = false;
  let activeMemoryId = 1;
  let observer = null;

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function config() {
    return window.AFTERGLOW_CONFIG || {};
  }

  function setMessage(message, error = false) {
    editorMessage.textContent = message;
    editorMessage.style.color = error ? "#ff9cae" : "#c7f5d2";
  }

  function makeDefaultMemories() {
    return Array.from({ length: 24 }, (_, index) => ({
      id: index + 1,
      title: `Memory ${String(index + 1).padStart(2, "0")}`,
      body: "A space waiting for a memory, a photograph, and the words worth keeping.",
      image_url: "",
      image_path: ""
    }));
  }

  function initSupabase() {
    const settings = config();

    if (
      !settings.url ||
      !settings.publishableKey ||
      settings.publishableKey.includes("PASTE_")
    ) {
      console.warn("Afterglow: Supabase configuration is incomplete.");
      return;
    }

    if (!window.supabase?.createClient) {
      console.error("Afterglow: Supabase library did not load.");
      return;
    }

    supabaseClient = window.supabase.createClient(
      settings.url,
      settings.publishableKey
    );
  }

  function imageMarkup(memory) {
    if (memory.image_url) {
      return `
        <img
          class="memory-image"
          src="${escapeHTML(memory.image_url)}"
          alt="${escapeHTML(memory.title || "Memory photograph")}"
          loading="lazy"
          decoding="async"
        >
      `;
    }

    return `
      <div class="image-placeholder">
        A memory waiting<br>to be discovered ✦
      </div>
    `;
  }

  function renderMemories() {
    if (observer) observer.disconnect();

    gallery.innerHTML = "";

    memories.forEach((memory, index) => {
      const panel = document.createElement("article");

      panel.className =
        "memory-panel" + (index % 2 === 1 ? " reverse" : "");

      panel.dataset.memoryId = String(memory.id);

      panel.innerHTML = `
        <div class="memory-visual">
          <span class="memory-number">
            ${String(memory.id).padStart(2, "0")}
          </span>

          <div class="memory-image-wrap">
            ${imageMarkup(memory)}
          </div>
        </div>

        <div class="memory-copy">
          <span class="memory-kicker">FRAGMENT ${String(memory.id).padStart(2, "0")}</span>
          <h3>${escapeHTML(memory.title || "")}</h3>
          <div class="memory-body">${escapeHTML(memory.body || "")}</div>
          <div class="memory-divider"></div>
        </div>
      `;

      const img = panel.querySelector(".memory-image");

      if (img) {
        img.addEventListener("error", () => {
          const wrap = img.parentElement;
          wrap.innerHTML = `
            <div class="image-placeholder">
              This photograph could not be loaded.
            </div>
          `;
        }, { once: true });
      }

      gallery.appendChild(panel);
    });

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });

      gallery.querySelectorAll(".memory-panel").forEach((panel) => {
        observer.observe(panel);
      });
    } else {
      gallery.querySelectorAll(".memory-panel").forEach((panel) => {
        panel.classList.add("visible");
      });
    }
  }

  async function loadMemories() {
    gallery.innerHTML =
      '<div class="loading-message">Gathering the memories…</div>';

    if (!supabaseClient) {
      memories = makeDefaultMemories();
      renderMemories();

      const settings = config();

      if (!settings.url || !settings.publishableKey ||
          settings.publishableKey.includes("PASTE_")) {
        gallery.insertAdjacentHTML(
          "afterbegin",
          '<p class="empty-message">Connect Supabase in config.js to enable permanent saved memories.</p>'
        );
      }

      return;
    }

    const { data, error } = await supabaseClient
      .from("memories")
      .select("id,title,body,image_url,image_path")
      .order("id", { ascending: true });

    if (error) {
      console.error("Could not load memories:", error.message);
      memories = makeDefaultMemories();
      renderMemories();

      gallery.insertAdjacentHTML(
        "afterbegin",
        '<p class="empty-message">Could not load saved memories. Check the Supabase database and security policies.</p>'
      );
      return;
    }

    const savedById = new Map(
      (data || []).map((memory) => [Number(memory.id), memory])
    );

    memories = makeDefaultMemories().map((fallback) => ({
      ...fallback,
      ...(savedById.get(fallback.id) || {})
    }));

    renderMemories();
  }

  function openModal() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function showLoggedOut() {
    currentUser = null;
    isOwner = false;

    loginForm.hidden = false;
    editor.hidden = true;

    ownerStatus.textContent =
      "Sign in with your owner account to manage memories.";

    $("#owner-button").textContent = "Owner Login";
  }

  function showLoggedIn() {
    loginForm.hidden = true;
    editor.hidden = false;

    ownerStatus.textContent =
      "You're signed in as the owner. Your saved changes are shared with visitors.";

    $("#owner-button").textContent = "Edit Memories";

    populateMemorySelect();
    fillEditor();
  }

  async function checkSession() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Could not check session:", error.message);
      return;
    }

    await applyUser(data.session?.user || null);
  }

  async function applyUser(user) {
    currentUser = user;
    const ownerId = String(config().ownerId || "").toLowerCase();

    isOwner = Boolean(
      user &&
      ownerId &&
      !ownerId.includes("PASTE_") &&
      user.id.toLowerCase() === ownerId
    );

    if (isOwner) {
      showLoggedIn();
    } else {
      showLoggedOut();

      if (user) {
        ownerStatus.textContent =
          "This account is not authorized to edit Afterglow.";
      }
    }
  }

  function populateMemorySelect() {
    memorySelect.innerHTML = memories.map((memory) => `
      <option value="${memory.id}">
        ${String(memory.id).padStart(2, "0")} — ${escapeHTML(memory.title)}
      </option>
    `).join("");

    memorySelect.value = String(activeMemoryId);
  }

  function fillEditor() {
    const memory = memories.find(
      (item) => Number(item.id) === Number(activeMemoryId)
    );

    if (!memory) return;

    $("#memory-title").value = memory.title || "";
    $("#memory-body").value = memory.body || "";
    $("#memory-image").value = "";
    setMessage("");
  }

  function getActiveMemory() {
    return memories.find(
      (item) => Number(item.id) === Number(activeMemoryId)
    );
  }

  async function saveMemory() {
    if (!supabaseClient || !isOwner || !currentUser) {
      setMessage("Please sign in with the authorized owner account.", true);
      return;
    }

    const memory = getActiveMemory();

    if (!memory) {
      setMessage("Memory not found.", true);
      return;
    }

    const title = $("#memory-title").value.trim();
    const body = $("#memory-body").value;
    const file = $("#memory-image").files[0];
    const settings = config();

    if (title.length > 120 || body.length > 12000) {
      setMessage("The title or text is too long.", true);
      return;
    }

    if (file && file.size > MAX_IMAGE_SIZE) {
      setMessage("Choose an image smaller than 5 MB.", true);
      return;
    }

    if (file && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setMessage("Choose a JPG, PNG, WEBP, or GIF image.", true);
      return;
    }

    const saveButton = $("#save-memory");
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    setMessage("");

    let imageUrl = memory.image_url || null;
    let imagePath = memory.image_path || null;

    try {
      if (file) {
        const extensionMap = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif"
        };

        const extension = extensionMap[file.type];
        const newPath =
          `${currentUser.id}/${memory.id}-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabaseClient.storage
          .from(settings.bucketName || "afterglow-images")
          .upload(newPath, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
          .from(settings.bucketName || "afterglow-images")
          .getPublicUrl(newPath);

        imageUrl = urlData.publicUrl;
        imagePath = newPath;
      }

      const update = {
        title,
        body,
        image_url: imageUrl,
        image_path: imagePath,
        owner_id: currentUser.id
      };

      const { data, error } = await supabaseClient
        .from("memories")
        .update(update)
        .eq("id", Number(memory.id))
        .select("id,title,body,image_url,image_path,owner_id")
        .single();

      if (error) throw error;

      memories = memories.map((item) =>
        Number(item.id) === Number(data.id)
          ? { ...item, ...data }
          : item
      );

      renderMemories();
      populateMemorySelect();
      fillEditor();

      setMessage("Saved successfully. Visitors can now see your changes.");

    } catch (error) {
      console.error("Save failed:", error);
      setMessage(
        error.message || "Could not save. Check your Supabase setup.",
        true
      );
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  }

  async function removeImage() {
    if (!supabaseClient || !isOwner || !currentUser) {
      setMessage("Please sign in with the authorized owner account.", true);
      return;
    }

    const memory = getActiveMemory();

    if (!memory || !memory.image_url) {
      setMessage("There is no photo in this panel to remove.", true);
      return;
    }

    const removeButton = $("#remove-image");
    removeButton.disabled = true;
    removeButton.textContent = "Removing…";

    try {
      const { data, error } = await supabaseClient
        .from("memories")
        .update({
          image_url: null,
          image_path: null,
          owner_id: currentUser.id
        })
        .eq("id", Number(memory.id))
        .select("id,title,body,image_url,image_path,owner_id")
        .single();

      if (error) throw error;

      memories = memories.map((item) =>
        Number(item.id) === Number(data.id)
          ? { ...item, ...data }
          : item
      );

      renderMemories();
      fillEditor();
      setMessage("Photo removed from this memory.");

      // Old files may remain in storage; removing the database reference
      // does not automatically delete the actual uploaded file.

    } catch (error) {
      console.error("Photo removal failed:", error);
      setMessage(error.message || "Could not remove the photo.", true);
    } finally {
      removeButton.disabled = false;
      removeButton.textContent = "Remove photo";
    }
  }

  async function signIn(event) {
    event.preventDefault();

    if (!supabaseClient) {
      ownerStatus.textContent =
        "Finish config.js setup before signing in.";
      return;
    }

    const email = $("#owner-email").value.trim();
    const password = $("#owner-password").value;
    const button = loginForm.querySelector("button[type='submit']");

    button.disabled = true;
    button.textContent = "Signing in…";
    ownerStatus.textContent = "";

    try {
      const { data, error } = await supabaseClient.auth
        .signInWithPassword({ email, password });

      if (error) throw error;

      await applyUser(data.user);

      if (!isOwner) {
        await supabaseClient.auth.signOut();
        ownerStatus.textContent =
          "That account is not the configured owner account.";
        return;
      }

      await loadMemories();
      populateMemorySelect();
      fillEditor();

    } catch (error) {
      ownerStatus.textContent =
        error.message || "Sign-in failed. Check your email and password.";
    } finally {
      button.disabled = false;
      button.textContent = "Sign in";
    }
  }

  async function signOut() {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        setMessage(error.message, true);
        return;
      }
    }

    showLoggedOut();
    setMessage("Signed out.");
  }

  /* Floating particles */

  function initParticles() {
    const canvas = $("#particles");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.min(55, Math.floor(width / 8));

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.4,
        speed: Math.random() * 0.25 + 0.08,
        opacity: Math.random() * 0.5 + 0.15
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.y -= particle.speed;

        if (particle.y < -5) {
          particle.y = height + 5;
          particle.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = `rgba(205, 166, 255, ${particle.opacity})`;
        ctx.fill();
      });

      if (!document.hidden) {
        requestAnimationFrame(draw);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) requestAnimationFrame(draw);
    });

    requestAnimationFrame(draw);
  }

  /* Controls */

  $("#owner-button").addEventListener("click", openModal);
  $("#close-modal").addEventListener("click", closeModal);

  modal.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  loginForm.addEventListener("submit", signIn);

  memorySelect.addEventListener("change", () => {
    activeMemoryId = Number(memorySelect.value);
    fillEditor();
  });

  $("#save-memory").addEventListener("click", saveMemory);
  $("#remove-image").addEventListener("click", removeImage);
  $("#logout-button").addEventListener("click", signOut);

  /* Start Afterglow */

  async function start() {
    initParticles();
    initSupabase();
    await loadMemories();
    await checkSession();

    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => {
          applyUser(session?.user || null);
        }, 0);
      });
    }
  }

  start();
})();
