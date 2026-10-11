
const gallery = document.getElementById("gallery-grid");
const count = document.getElementById("photo-count");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");

const closeButton = document.getElementById("close-lightbox");
const previousButton = document.getElementById("prev-photo");
const nextButton = document.getElementById("next-photo");

const photos = Array.isArray(window.AFTERGLOW_PHOTOS)
  ? window.AFTERGLOW_PHOTOS
  : [];

let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;
let visiblePhotos = [];

/* Render the photo gallery */

function renderGallery() {
  gallery.innerHTML = "";
  visiblePhotos = [];

  photos.forEach((photo) => {
    if (!photo || !photo.src) return;

    const card = document.createElement("article");
    card.className = "photo-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", photo.caption || "Open photo");

    const image = document.createElement("img");
    image.src = photo.src;
    image.alt = photo.caption || "An Afterglow memory";
    image.loading = "lazy";
    image.decoding = "async";

    const caption = document.createElement("p");
    caption.className = "photo-caption";
    caption.textContent = photo.caption || "A little moment";

    card.append(image, caption);

    image.addEventListener("error", () => {
      const index = visiblePhotos.indexOf(photo);

      if (index !== -1) {
        visiblePhotos.splice(index, 1);
      }

      card.remove();
      updateCount();
    });

    card.addEventListener("click", () => {
      openPhoto(photo);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPhoto(photo);
      }
    });

    visiblePhotos.push(photo);
    gallery.appendChild(card);
  });

  updateCount();

  if (visiblePhotos.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-gallery";
    message.textContent =
      "Your memories will appear here after you add photo links in config.js.";

    gallery.appendChild(message);
  }
}

function updateCount() {
  const total = visiblePhotos.length;
  count.textContent = `${total} ${total === 1 ? "memory" : "memories"}`;
}

/* Open a photo in the full-screen viewer */

function openPhoto(photo) {
  const index = visiblePhotos.indexOf(photo);

  if (index === -1) return;

  currentIndex = index;

  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.caption || "An Afterglow memory";
  lightboxCaption.textContent = photo.caption || "A little moment";

  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");

  closeButton.focus();
}

/* Close the viewer */

function closePhoto() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");

  lightboxImage.src = "";
}

/* Move between photos */

function changePhoto(direction) {
  if (visiblePhotos.length < 2) return;

  currentIndex =
    (currentIndex + direction + visiblePhotos.length) %
    visiblePhotos.length;

  const photo = visiblePhotos[currentIndex];

  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.caption || "An Afterglow memory";
  lightboxCaption.textContent = photo.caption || "A little moment";
}

closeButton.addEventListener("click", closePhoto);

previousButton.addEventListener("click", () => {
  changePhoto(-1);
});

nextButton.addEventListener("click", () => {
  changePhoto(1);
});

/* Close when the dark background is tapped */

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closePhoto();
  }
});

/* Keyboard controls */

document.addEventListener("keydown", (event) => {
  if (!lightbox.classList.contains("open")) return;

  if (event.key === "Escape") {
    closePhoto();
  }

  if (event.key === "ArrowLeft") {
    changePhoto(-1);
  }

  if (event.key === "ArrowRight") {
    changePhoto(1);
  }
});

/* Swipe controls for mobile */

lightbox.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
  },
  { passive: true }
);

lightbox.addEventListener(
  "touchend",
  (event) => {
    const endX = event.changedTouches[0].screenX;
    const endY = event.changedTouches[0].screenY;

    const differenceX = endX - touchStartX;
    const differenceY = endY - touchStartY;

    if (
      Math.abs(differenceX) > 55 &&
      Math.abs(differenceX) > Math.abs(differenceY)
    ) {
      changePhoto(differenceX < 0 ? 1 : -1);
    }
  },
  { passive: true }
);

/* Start the website */

renderGallery();

