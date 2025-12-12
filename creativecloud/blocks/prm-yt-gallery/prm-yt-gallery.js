import { createTag, getScreenSizeCategory } from '../../scripts/utils.js';

const CARD_LIMIT = { desktop: 15, tablet: 9, mobile: 10 };
const ADOBE_STOCK_API_KEY = 'milo-prm-yt-gallery';
const ADOBE_STOCK_PRODUCT = 'creativecloud';
const props = {
  collectionId: null,
  buttonText: 'Edit this template',
  freeTagText: null,
};
const ICONS = {
  close: `
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="31" height="22" rx="11" fill="white"/>
      <path d="M16.2883 10.7253L19.2951 7.71885C19.4643 7.54966 19.4643 7.27557 19.2951 7.10638C19.1259 6.93719 18.8518 6.93719 18.6826 7.10638L15.6758 10.1129L12.669 7.10638C12.4999 6.93719 12.2258 6.93719 12.0566 7.10638C11.8874 7.27557 11.8874 7.54966 12.0566 7.71885L15.0633 10.7253L12.0566 13.7318C11.8874 13.901 11.8874 14.1751 12.0566 14.3443C12.1412 14.4289 12.252 14.4712 12.3628 14.4712C12.4736 14.4712 12.5844 14.4289 12.669 14.3443L15.6758 11.3378L18.6826 14.3443C18.7672 14.4289 18.878 14.4712 18.9888 14.4712C19.0996 14.4712 19.2105 14.4289 19.2951 14.3443C19.4642 14.1751 19.4642 13.901 19.2951 13.7318L16.2883 10.7253Z" fill="#292929"/>
    </svg>
  `,

  info: `
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.6752 15.7781C12.8886 15.7781 10.6221 13.5116 10.6221 10.725C10.6221 7.93845 12.8886 5.67188 15.6752 5.67188C18.4617 5.67188 20.7283 7.93845 20.7283 10.725C20.7283 13.5116 18.4617 15.7781 15.6752 15.7781ZM15.6752 6.53812C13.3663 6.53812 11.4883 8.41613 11.4883 10.725C11.4883 13.0339 13.3663 14.9119 15.6752 14.9119C17.9841 14.9119 19.8621 13.0339 19.8621 10.725C19.8621 8.41613 17.9841 6.53812 15.6752 6.53812Z" fill="#292929"/>
    <path d="M15.6756 7.98826C15.8088 7.98357 15.9386 8.03092 16.0375 8.12029C16.2282 8.33111 16.2282 8.65218 16.0375 8.863C15.9397 8.95454 15.8095 9.00338 15.6756 8.99873C15.5391 9.00421 15.4065 8.95233 15.31 8.85566C15.2164 8.7587 15.1661 8.62794 15.1706 8.49325C15.1635 8.35755 15.2108 8.22462 15.3021 8.12399C15.4024 8.02886 15.5377 7.97969 15.6756 7.98826Z" fill="#292929"/>
    <path d="M15.6753 13.6487C15.4362 13.6487 15.2422 13.4547 15.2422 13.2155V10.4234C15.2422 10.1842 15.4362 9.99023 15.6753 9.99023C15.9144 9.99023 16.1084 10.1842 16.1084 10.4234V13.2155C16.1084 13.4547 15.9144 13.6487 15.6753 13.6487Z" fill="#292929"/>
  </svg>
  `,
};

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
    isFree: apiItem.is_free || false,
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
 * Reads properties based on label names (case-insensitive), independent of row order.
 */
function parseBlockProps(block) {
  const rows = Array.from(block.children);

  rows.forEach((row) => {
    const cols = row.querySelectorAll('div');
    if (cols.length >= 2) {
      const label = cols[0].textContent.trim().toLowerCase();
      const value = cols[1].textContent.trim();

      if (!value) return;

      switch (label) {
        case 'collectionid':
          props.collectionId = value;
          break;
        case 'button':
        case 'button-text':
          props.buttonText = value;
          break;
        case 'free-tag-text':
          props.freeTagText = value;
          break;
        default:
          // Ignore unknown labels
          break;
      }
    }
  });

  return props;
}

/**
 * Expands a card visually and starts the video playback
 * (if the info overlay is not currently visible).
 *
 * @param {HTMLElement} card - The card element to expand.
 * @param {HTMLVideoElement} video - The optional video element inside the card.
 */
function expandCard(card, video) {
  card.classList.add('expanded');

  if (video && !card.classList.contains('info-visible')) {
    video.currentTime = 0;
    video.addEventListener('canplay', () => {
      video.style.opacity = 1;
      video.play().catch(() => {});
    });
  }
}

/**
 * Collapses a card visually and stops the video playback.
 *
 * @param {HTMLElement} card - The card element to collapse.
 * @param {HTMLVideoElement} video - The optional video element inside the card.
 */
function collapseCard(card, video) {
  card.classList.remove('expanded');
  card.classList.remove('info-visible');
  if (video) video.pause();
}

/**
 * Creates a reusable close (X) button for cards or overlays.
 *
 * @param {string} className - The CSS class to apply to the button.
 * @param {string} ariaLabel - Accessible label describing the button action.
 * @param {Function} onClick - Function executed when the button is clicked.
 * @param {number} [tabIndex=0](Optional) - Keyboard tab order (0 = normal, -1 = skip).
 * @returns {HTMLButtonElement} - A fully configured close button element.
 */
function createCloseButton(className, ariaLabel, onClick, tabIndex = 0) {
  const closeButton = createTag('button', {
    class: className,
    'aria-label': ariaLabel,
    type: 'button',
    tabIndex,
  });

  closeButton.innerHTML = ICONS.close;

  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });

  return closeButton;
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
  infoButton.innerHTML = ICONS.info;
  return infoButton;
}

/**
 * Creates the close button (X) for the card.
 */
function createCloseCardButton(card) {
  const video = card.querySelector('.video-wrapper video');

  return createCloseButton(
    'pre-yt-close-card-button',
    'Close card',
    () => collapseCard(card, video),
  );
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
 * Creates the info overlay containing close button and text.
 */
function createInfoOverlay() {
  const overlay = createTag('div', { class: 'pre-yt-info-overlay' });
  const overlayText = createTag('p', { class: 'pre-yt-overlay-text' });

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
  const card = createTag('div', { class: 'pre-yt-card shimmer', tabindex: '0' });
  const cardInner = createTag('div', { class: 'pre-yt-card-inner' });
  const imageWrapper = createTag('div', { class: 'image-wrapper' });
  const videoWrapper = createTag('div', { class: 'video-wrapper' });
  const shouldShowEditButton = isIOSDevice();

  if (shouldShowEditButton) {
    videoWrapper.append(createEditButton(buttonText));
  }
  videoWrapper.append(createInfoButton());
  videoWrapper.append(createCloseCardButton(card));
  videoWrapper.append(createInfoOverlay());

  cardInner.append(imageWrapper);
  cardInner.append(videoWrapper);
  card.append(cardInner);
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
  const closeCardButton = card.querySelector('.pre-yt-close-card-button');
  const video = card.querySelector('.video-wrapper video');
  const editButton = card.querySelector('.pre-yt-button');

  // Create and insert the overlay close button
  const closeOverlayButton = createCloseButton(
    'pre-yt-overlay-close',
    'Close info',
    () => {
      card.classList.remove('info-visible');
      if (video) {
        video.play().catch(() => {});
      }
    },
    -1,
  );

  if (infoButton && overlay) {
    infoButton.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.add('info-visible');
      if (video) {
        video.pause();
      }
      if (closeOverlayButton) {
        closeOverlayButton.tabindex = 0;
        closeOverlayButton.focus();
      }
    });
  }

  overlay.appendChild(closeOverlayButton);

  closeOverlayButton.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (editButton) {
        card.overlayJustClosed = true;
        editButton.focus();
      } else if (closeCardButton) {
        closeCardButton.focus();
      }
    }
  });

  if (editButton) {
    editButton.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        infoButton.focus();
      }
    });
  }

  if (closeCardButton) {
    closeCardButton.setAttribute('tabindex', '0');
    closeCardButton.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const grid = card.closest('.pre-yt-grid');
        if (grid) {
          const cards = Array.from(grid.querySelectorAll('.pre-yt-card'));
          const idx = cards.indexOf(card);
          const nextCard = cards[idx + 1];
          if (nextCard) {
            e.preventDefault();
            nextCard.focus();
          }
        }
      }
    });
  }
}

function setupVideoHoverBehavior(container) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  container.querySelectorAll('.pre-yt-card').forEach((card) => {
    const video = card.querySelector('.video-wrapper video');

    if (isMobile) {
      card.addEventListener('click', () => {
        expandCard(card, video);
      });
    }
    card.addEventListener('mouseenter', () => {
      expandCard(card, video);
    });

    card.addEventListener('mouseleave', () => {
      collapseCard(card, video);
    });

    card.addEventListener('focusin', () => {
      card.classList.add('expanded');
      if (video && !card.classList.contains('info-visible')) {
        video.currentTime = 0;
        video.addEventListener('canplay', () => {
          video.style.opacity = 1;
          video.play().catch(() => {
          });
        });
      }
    });

    card.addEventListener('focusout', (e) => {
      const related = e.relatedTarget;
      if (!card.contains(related)) {
        card.classList.remove('expanded');
        card.classList.remove('info-visible');
        if (video) {
          video.pause();
        }
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

function setupFreeTag(container, freeTagText) {
  const freeTag = createTag('div', { class: 'pre-yt-free-tag' });
  if (freeTagText) freeTag.textContent = freeTagText;
  container.append(freeTag);
}

function updateCardsWithData(container, data, vpCardLimit, freeTagText) {
  const cards = container.querySelectorAll('.pre-yt-card');
  const rawItems = data?.files?.slice(0, vpCardLimit) || [];
  rawItems.forEach((rawItem, index) => {
    if (cards[index]) {
      const item = normalizeItem(rawItem);
      const eager = index < 6;
      updateCardWithImage(cards[index], item, eager);
      if (item.isFree) setupFreeTag(cards[index], freeTagText);
    }
  });
  // Setup hover behavior after cards are updated
  setupVideoHoverBehavior(container);
}

export default function init(el) {
  const blockProps = parseBlockProps(el);
  el.innerHTML = '';
  const viewport = getScreenSizeCategory({ mobile: 599, tablet: 1199 });
  const vpCardLimit = CARD_LIMIT[viewport];
  const grid = createTag('div', { class: 'pre-yt-grid' });
  el.append(grid);

  // Render shimmer placeholders (renders max cards needed across all viewports)
  renderShimmerGrid(grid, blockProps.buttonText, vpCardLimit);

  if (!blockProps.collectionId) {
    window.lana?.log('Collection ID is required for prm-yt-gallery', { tags: 'prm-yt-gallery' });
    return;
  }

  // Fetch data from Adobe Stock API
  fetchAdobeStockData({
    collectionId: blockProps.collectionId,
    offset: 0,
    limit: 96,
  }, vpCardLimit).then((data) => {
    if (data) {
      updateCardsWithData(grid, data, vpCardLimit, blockProps.freeTagText);
    }
  });
}
