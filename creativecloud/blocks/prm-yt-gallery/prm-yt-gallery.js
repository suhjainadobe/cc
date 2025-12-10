import { createTag } from '../../scripts/utils.js';

const CARD_LIMIT = 15;

/**
 * Normalizes API item to consistent internal structure.
 * Update this mapping if API keys change.
 */
function normalizeItem(apiItem) {
  return {
    image: apiItem.image || '',
    altText: apiItem.alt_text || '',
    deepLinkUrl: apiItem.deep_link_url || '',
    video: apiItem.video || '',
  };
}


function createImageElement(src, alt = '', eager = false) {
  return createTag('img', {
    src,
    alt,
    loading: eager ? 'eager' : 'lazy',
  });
}

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    window.lana?.log(`Failed to fetch pre-yt data: ${error.message}`, { tags: 'pre-yt' });
    return null;
  }
}

function parseBlockProps(block) {
  const props = {
    jsonUrl: null,
    buttonText: 'Edit this template',
  };

  const rows = Array.from(block.children);

  // First row: JSON URL
  if (rows.length > 0) {
    const firstRow = rows[0];
    const firstDiv = firstRow.querySelector('div');
    if (firstDiv) {
      props.jsonUrl = firstDiv.textContent.trim();
    }
  }

  // Second row: Button text
  if (rows.length > 1) {
    const secondRow = rows[1];
    const cols = secondRow.querySelectorAll('div');
    if (cols.length >= 2) {
      const buttonTextValue = cols[1].textContent.trim();
      if (buttonTextValue) {
        props.buttonText = buttonTextValue;
      }
    }
  }

  return props;
}

/**
 * Creates the info button (ⓘ) for showing template details.
 */
function createInfoButton() {
  const infoButton = createTag('button', {
    class: 'pre-yt-info-button',
    'aria-label': 'Show info',
    type: 'button',
  });
  infoButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="white" stroke-width="1.5" fill="none"/>
      <text x="10" y="14" text-anchor="middle" fill="white" font-size="11" font-weight="600" font-family="Arial, sans-serif">i</text>
    </svg>`;
  return infoButton;
}

/**
 * Creates the "Edit this template" button.
 */
function createEditButton(buttonText) {
  const button = createTag('a', { class: 'pre-yt-button' });
  button.textContent = buttonText;
  return button;
}

/**
 * Creates the close button (X) for the info overlay.
 */
function createCloseButton() {
  const closeButton = createTag('button', {
    class: 'pre-yt-overlay-close',
    'aria-label': 'Close info',
    type: 'button',
  });
  closeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12 4L4 12M4 4L12 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  return closeButton;
}

/**
 * Creates the info overlay containing close button and text.
 */
function createInfoOverlay() {
  const overlay = createTag('div', { class: 'pre-yt-info-overlay' });
  const closeButton = createCloseButton();
  const overlayText = createTag('p', { class: 'pre-yt-overlay-text' });

  overlay.append(closeButton);
  overlay.append(overlayText);
  return overlay;
}

/**
 * Creates a shimmer card placeholder with all UI elements.
 */
function createShimmerCard(buttonText) {
  const card = createTag('div', { class: 'pre-yt-card shimmer' });
  const imageWrapper = createTag('div', { class: 'image-wrapper' });
  const videoWrapper = createTag('div', { class: 'video-wrapper' });

  videoWrapper.append(createInfoButton());
  videoWrapper.append(createEditButton(buttonText));
  videoWrapper.append(createInfoOverlay());

  card.append(imageWrapper);
  card.append(videoWrapper);
  return card;
}

function updateCardWithImage(card, item, eager = false) {
  const imageWrapper = card.querySelector('.image-wrapper');
  const videoWrapper = card.querySelector('.video-wrapper');
  const button = card.querySelector('.pre-yt-button');
  const overlayText = card.querySelector('.pre-yt-overlay-text');

  // Add image
  const img = createImageElement(item.image, item.altText, eager);

  if (img.complete) {
    card.classList.remove('shimmer');
  } else {
    img.addEventListener('load', () => {
      card.classList.remove('shimmer');
    });
    img.addEventListener('error', () => {
      card.classList.remove('shimmer');
    });
  }

  imageWrapper.append(img);

  // Update button href
  if (button && item.deepLinkUrl) {
    button.href = item.deepLinkUrl;
  }

  // Update overlay text
  if (overlayText) {
    overlayText.textContent = item.altText || '';
  }

  // Add video if available
  if (item.video && videoWrapper) {
    const posterUrl = item.image;
    const video = createTag('video', {
      src: item.video,
      poster: posterUrl,
    });
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    videoWrapper.append(video);
  }
}

function setupInfoOverlay(card) {
  const infoButton = card.querySelector('.pre-yt-info-button');
  const overlay = card.querySelector('.pre-yt-info-overlay');
  const closeButton = card.querySelector('.pre-yt-overlay-close');
  const video = card.querySelector('.video-wrapper video');

  if (infoButton && overlay) {
    infoButton.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.add('info-visible');
      if (video) {
        video.pause();
      }
    });
  }

  if (closeButton && overlay) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.remove('info-visible');
      if (video) {
        video.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    });
  }
}

function setupVideoHoverBehavior(container) {
  container.querySelectorAll('.pre-yt-card').forEach((card) => {
    const video = card.querySelector('.video-wrapper video');

    card.addEventListener('mouseenter', () => {
      card.classList.add('expanded');
      // Don't play video if info overlay is visible
      if (video && !card.classList.contains('info-visible')) {
        video.currentTime = 0;
        video.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('expanded');
      card.classList.remove('info-visible');
      if (video) {
        video.pause();
      }
    });

    // Setup info overlay interactions
    setupInfoOverlay(card);
  });
}

function renderShimmerGrid(container, buttonText) {
  for (let i = 0; i < CARD_LIMIT; i += 1) {
    container.append(createShimmerCard(buttonText));
  }
}

function updateCardsWithData(container, data) {
  const cards = container.querySelectorAll('.pre-yt-card');
  const rawItems = data?.data?.slice(0, CARD_LIMIT) || [];

  rawItems.forEach((rawItem, index) => {
    if (cards[index]) {
      const item = normalizeItem(rawItem);
      const eager = index < 6;
      updateCardWithImage(cards[index], item, eager);
    }
  });

  // Setup hover behavior after cards are updated
  setupVideoHoverBehavior(container);
}

export default function init(el) {
  const props = parseBlockProps(el);
  el.innerHTML = '';

  const grid = createTag('div', { class: 'pre-yt-grid' });
  el.append(grid);

  // Render shimmer placeholders
  renderShimmerGrid(grid, props.buttonText);

  if (!props.jsonUrl) {
    return;
  }
  // Fetch and update existing cards with real images
  fetchData(props.jsonUrl).then((data) => {
    if (data) {
      updateCardsWithData(grid, data);
    }
  });
}
