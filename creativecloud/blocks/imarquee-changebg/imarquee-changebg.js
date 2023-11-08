import { setLibs } from '../../scripts/utils.js';

const LIBS = '/libs';
const miloLibs = setLibs(LIBS);
const { createTag } = await import(`${miloLibs}/utils/utils.js`);

const base = `${window.location.origin}/creativecloud`;
const localAssetsRoot = `${base}/assets/imarquee-changebg`;

function getPicture(row, idx) {
  return row.children[idx].querySelector('picture');
}

function getImageUrl(row, col) {
  return getPicture(row, col)?.querySelector('source').srcset;
}

function getText(row) {
  return row.children[0].innerText.trim();
}

export default async function init(el) {
  console.log('sss');
  if (document.querySelector('meta[name="debug"]').content === 'on' || 
  (new URLSearchParams(document.location.search)).get('debug') == 'on'
  ) {
    const { default: debug } = await import('./author-feedback.js');
    debug(el);
  }

  const config = {
    desktop: { groups: [] },
    tablet: { groups: [] },
    mobile: { groups: [] }
  }

  const rows = el.querySelectorAll(':scope > div');
  rows.forEach(r => r.className = 'hide-block');

  const SKUS = ['mobile', 'tablet', 'desktop'];

  const LCP_OFFSETS = [1, 3, 5]; // ['background', 'foreground', 'text'];
  const data = {};
  ['background', 'foreground', 'text'].forEach((lcp, lcpIdx) => {
    data[lcp] = SKUS.reduce((acc, sku, skuIdx) => {
      const row = rows[LCP_OFFSETS[lcpIdx]];
      acc[sku] = getPicture(
        row,
        skuIdx
      )
      return acc;
    }, {})
  })

  const gradient = () => {
    const gradient = document.createElement('div');
    gradient.className = 'imarquee-gradient';
    return gradient;
  }

  const mobileComposite = createTag('div', { class: 'imarquee-composite' }, [data.background.mobile, gradient(), data.foreground.mobile]);
  const mobileContainer = createTag('div', { class: 'imarquee-mobile' }, [data.text.mobile, mobileComposite]);

  const tabletComposite = createTag('div', { class: 'imarquee-composite' }, [data.background.tablet, gradient(), data.foreground.tablet, data.text.tablet]);
  const tabletContainer = createTag('div', { class: 'imarquee-tablet' }, tabletComposite);

  const desktopComposite = createTag('div', { class: 'imarquee-composite' }, [data.background.desktop, gradient(), data.foreground.desktop, data.text.desktop]);
  const desktopContainer = createTag('div', { class: 'imarquee-desktop' }, desktopComposite);

  el.append(mobileContainer, tabletContainer, desktopContainer);

  setTimeout(() => {
    const GROUP_REGEX = /group\s+(\d)\s*:\s*(.*)/i;
    const GROUP_ICON_URLS = ['remove-background-icon', 'change-photo-icon', 'change-color-icon', 'change-pattern-icon'].map(v => `${localAssetsRoot}/${v}.svg`)
    const GRP_OFFSET = [6, 7, 12, 16];

    GRP_OFFSET.forEach((gOffset, gIdx) => {
      const row = rows[gOffset]
      const name = row.innerText.trim().match(GROUP_REGEX)[2];
      let iconUrl = GROUP_ICON_URLS[gIdx];
      if (gIdx === 0) { // remove background
        SKUS.forEach(sku => config[sku].groups[gIdx] = { name, iconUrl } )
      } else if (gIdx == 2) { // change color
        const col1 = getText(rows[gOffset+1]);
        const col2 = getText(rows[gOffset+2]);
        const col3 = getText(rows[gOffset+3]);
        SKUS.forEach((sku) => {
          const options = sku === 'desktop' ? [ { src: col1 }, { src: col2 }, { src: col3 }] : [ { src: col1 }]
          config[sku].groups[gIdx] = { name, iconUrl, options }
        })
      } else { // change photo/pattern
        const get3Img = (row) => [0, 1, 2].map(col => getImageUrl(row, col));
        const swatchSrc = get3Img(rows[gOffset+1]);
        const pics1 = get3Img(rows[gOffset+2]);
        const pics2 = get3Img(rows[gOffset+3]);
        const pics3 = get3Img(rows[gOffset+4]);
        SKUS.forEach((sku, idx) => {
          const options = sku === 'desktop' ? [
            { src: pics1[idx], swatchSrc: swatchSrc[0]},
            { src: pics2[idx], swatchSrc: swatchSrc[1]},
            { src: pics3[idx], swatchSrc: swatchSrc[2]},
          ] : [ { src: pics1[idx], swatchSrc: swatchSrc[idx]} ]
          config[sku].groups[gIdx] = { name, iconUrl, options }
        })
      }
    })

    const tryItText = getText(rows[22]);

    SKUS.forEach(sku => {
      const srcSetIdx = sku === 'mobile' ? 1 : 0;
      const addl = {
        marqueeTitleImgSrc: data.text[sku].children[srcSetIdx].srcset,
        talentSrc: data.foreground[sku].children[srcSetIdx].srcset,
        defaultBgSrc: data.background[sku].children[srcSetIdx].srcset,
        tryitSrc: `${localAssetsRoot}/tryit.svg`,
        tryitText: tryItText
      }
      if (sku === 'desktop') {
        addl.cursorSrc = `${localAssetsRoot}/desktop/dt-Mouse-arrow.svg`;
      }
      config[sku] = { ...config[sku], ...addl };
    })

    const marqueeEle = document.createElement('ft-changebackgroundmarquee');
    marqueeEle.config = config;

    import(`${base}/deps/imarquee-changebg/ft-everyonechangebgmarquee-8e121e97.js`);

    marqueeEle.addEventListener('preload', (ev) => {
      marqueeEle.updateComplete.then(() => {
        marqueeEle.classList.add('loaded');
      })
    })

    el.append(marqueeEle);

  })

}
