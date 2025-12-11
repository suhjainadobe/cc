import { createTag, getScreenSizeCategory } from '../../scripts/utils.js';

const CARD_LIMIT = { desktop: 15, tablet: 9, mobile: 10 };
const ADOBE_STOCK_API_KEY = 'milo-prm-yt-gallery';
const ADOBE_STOCK_PRODUCT = 'creativecloud';

/**
 * Cleans URL by removing escaped forward slashes.
 */
function cleanUrl(url) {
  if (!url) return '';
  return url.replace(/\\\//g, '/');
}

function createTemplateID(tempID) {
  const id = `https://premierepro.app.link/1RdAjG4WyYb?template_id=${tempID}`;
  return id;
}

/**
 * Normalizes API item to consistent internal structure.
 * Update this mapping if API keys change.
 */
function normalizeItem(apiItem) {
  return {
    image: cleanUrl(apiItem.thumbnail_url || ''),
    altText: apiItem.title || 'test text for now',
    deepLinkUrl: createTemplateID(apiItem.id) || '',
    video: cleanUrl(apiItem.video_preview_url || ''),
  };
}

function createImageElement(src, alt = '', eager = false) {
  return createTag('img', {
    src,
    alt,
    loading: eager ? 'eager' : 'lazy',
  });
}

/**
 * Fetches data from Adobe Stock API with required headers.
 */
async function fetchAdobeStockData(config, vpCardLimit) {
  const {
    collectionId,
    offset = 0,
    limit = vpCardLimit,
  } = config;

  try {
    const params = new URLSearchParams({
      'search_parameters[offset]': offset,
      'search_parameters[limit]': limit,
      ff_9909481692: '1',
      'search_parameters[enable_templates]': '1',
      'search_parameters[gallery_id]': collectionId,
    });

    const apiUrl = `https://stock.adobe.io/Rest/Media/1/Search/Collections?${params.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-product': ADOBE_STOCK_PRODUCT,
        'x-api-key': ADOBE_STOCK_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    window.lana?.log(`Failed to fetch Adobe Stock data: ${error.message}`, { tags: 'prm-yt-gallery' });
    return null;
  }
}

/**
 * Parses block properties from the authoring table.
 */
function parseBlockProps(block) {
  const props = {
    collectionId: null,
    buttonText: 'Edit this template',
    // rowCount: { desktop: 3, tablet: 3, mobile: 5 },
  };

  const rows = Array.from(block.children);

  // First row: collectionID | Collection ID value
  if (rows.length > 0) {
    const firstRow = rows[0];
    const cols = firstRow.querySelectorAll('div');

    if (cols.length >= 2) {
      const label = cols[0].textContent.trim().toLowerCase();
      const value = cols[1].textContent.trim();

      if (label === 'collectionid' && value) {
        props.collectionId = value;
      }
    }
  }

  // Second row: button-text | Button text value
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

  // if (rows.length > 2) {
  //   const cols = rows[2].querySelectorAll('div');
  //   if (cols.length >= 2) {
  //     const rowCountValue = cols[1].textContent.trim();
  //     if (rowCountValue) {
  //       const parts = rowCountValue.split('|').map((part) => parseInt(part.trim(), 10));
  //       if (parts.length >= 3 && parts.every((num) => !Number.isNaN(num))) {
  //         props.rowCount = {
  //           desktop: parts[2],
  //           tablet: parts[1],
  //           mobile: parts[0],
  //         };
  //       }
  //     }
  //   }
  // }

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

function isIOSDevice() {
  const ua = navigator.userAgent;
  const isiPhone = /iPhone/i.test(ua);
  const isiPadOld = /iPad/i.test(ua);
  const isiPadNew = /Macintosh/i.test(ua) && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  return isiPhone || isiPadOld || isiPadNew;
}

/**
 * Creates a shimmer card placeholder with all UI elements.
 */
function createShimmerCard(buttonText) {
  const card = createTag('div', { class: 'pre-yt-card shimmer' });
  const imageWrapper = createTag('div', { class: 'image-wrapper' });
  const videoWrapper = createTag('div', { class: 'video-wrapper' });
  const shouldShowEditButton = isIOSDevice();

  videoWrapper.append(createInfoButton());
  if (shouldShowEditButton) {
    videoWrapper.append(createEditButton(buttonText));
  }
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
        video.addEventListener('canplay', () => {
          video.style.opacity = 1;
          video.play().catch(() => {
            // Ignore autoplay errors
          });
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

function renderShimmerGrid(container, buttonText, vpCardLimit) {
  for (let i = 0; i < vpCardLimit; i += 1) {
    container.append(createShimmerCard(buttonText));
  }
}

function setupFreeTag(container) {
  const freeTag = createTag('div', { class: 'pre-yt-free-tag' });
  freeTag.textContent = 'Free'; //get from api
  container.append(freeTag);
}

function updateCardsWithData(container, data, vpCardLimit) {
  const cards = container.querySelectorAll('.pre-yt-card');
  const rawItems = data?.files?.slice(0, vpCardLimit) || [];
  rawItems.forEach((rawItem, index) => {
    if (cards[index]) {
      const item = normalizeItem(rawItem);
      const eager = index < 6;
      updateCardWithImage(cards[index], item, eager);
      setupFreeTag(cards[index]);
    }
  });
  // Setup hover behavior after cards are updated
  setupVideoHoverBehavior(container);
}

export default function init(el) {
  const props = parseBlockProps(el);
  el.innerHTML = '';
  const viewport = getScreenSizeCategory({ mobile: 599, tablet: 1199 });
  const vpCardLimit = CARD_LIMIT[viewport];
  const grid = createTag('div', { class: 'pre-yt-grid' });
  el.append(grid);

  // Render shimmer placeholders (renders max cards needed across all viewports)
  renderShimmerGrid(grid, props.buttonText, vpCardLimit);

  if (!props.collectionId) {
    window.lana?.log('Collection ID is required for prm-yt-gallery', { tags: 'prm-yt-gallery' });
    return;
  }

  // Fetch data from Adobe Stock API
  fetchAdobeStockData({
    collectionId: props.collectionId,
    offset: 0,
    limit: 96,
  }, vpCardLimit).then((data) => {
    if (data) {
      updateCardsWithData(grid, data, vpCardLimit);
    }
  });
}
