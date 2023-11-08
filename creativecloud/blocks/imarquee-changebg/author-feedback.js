document.getElementsByTagName('head')[0].insertAdjacentHTML(
  'beforeend',
  '<link rel="stylesheet" href="/libs/blocks/imarquee-changebg/author-feedback.css" />'
);

const LCP_SECTION_TITLES = ['background', 'foreground', 'text'];

const LCP_OFFSETS = [1, 3, 5]; // ['background', 'foreground', 'text'];

const GROUP_REGEX = /group\s+(\d)\s*:\s*(.*)/i;
const GRP_OFFSET = [6, 7, 12, 16];

const TXT_OFFSET = 21;

const IMAGE_DIMENSIONS = [
  [599, 591], // mobile
  [1199, 747], // tablet
  [1920, 860], // desktop
];

const IMAGE_DIMENSIONS_DESKTOPONLY = [null, null, IMAGE_DIMENSIONS[2]];

const THUMBNAILS_DIMENSIONS = [
  [70, 70], // image 1 thumbnail
  [70, 70], // image 2 thumbnail
  [70, 70], // image 3 thumbnail
]

const notificationsContainer = document.createElement('div');
notificationsContainer.className = 'notifications';

function notify(message, className) {
  const messageContainer = document.createElement('div');
  messageContainer.innerHTML = message;
  messageContainer.className = className;

  notificationsContainer.append(messageContainer);

  console.log('appending notification', message)
}

const errors = [];


function analyze(el) {

  const rows = el.querySelectorAll(':scope > div');

  function checkTextAny(rowIdx, errorHint) {
    const row = rows[rowIdx];
    const text = row?.children[0]?.innerText.toLowerCase().trim();
    if (!text || !text.length) {
      errors.push(`expecting ${errorHint} at row ${rowIdx}`);
      return;
    }
  }

  function checkTextExact(rowIdx, exactText) {
    const row = rows[rowIdx];
    const text = row?.children[0]?.innerText.toLowerCase().trim();
    if (!exactText || text !== exactText) {
      errors.push(`expecting '${exactText}' at row ${rowIdx})`);
      return;
    }
  }

  function checkHexColor(rowIdx) {
    const row = rows[rowIdx];
    const cells = [...row.children];
  
    if (cells.length !== 1) {
      errors.push(`invalid color field at row ${rowIdx}; groups should only have one value, found ${cells.length}`);
      return;
    }
  
    const color = cells[0].innerText.trim();
    if (color.match(/^#[a-f0-9]{6}$/)) {
      errors.push(`bad color format at row ${rowIdx}; format should be #rrggbb, found '${color}'`)
      return;
    }
  }
  
  

  function checkImages3(rowIdx, dimensions) {
    const row = rows[rowIdx];

    if (row.children.length !== 3) {
      errors.push('expecting three images')
    }
  
    const cells = [...row.children];
    cells.forEach((cell, colIdx) => {
  
      const picture = cell.children[0];
  
      if (!dimensions[colIdx] && picture) {
        errors.push(`row ${rowIdx}, col ${colIdx} should be empty`)
        return;
      }
  
      if (dimensions[colIdx] && !(picture instanceof HTMLPictureElement)) {
        errors.push(`expected an image in row ${rowIdx}, col ${colIdx}`);
        return;
      }
  
      if (picture) {
        const img = picture.children[3];
  
        if (img.width !== dimensions[colIdx][0] || img.height !== dimensions[colIdx][1]) {
          errors.push(`wrong image size in row ${rowIdx}, col ${colIdx}: ${[img.width, img.height]}, expecting ${dimensions[colIdx]}`);
        }
      }
    })
  }
  

  // check LCP images
  LCP_SECTION_TITLES.forEach((lcp, lcpIdx) => {
    // section
    const contentRowIdx = LCP_OFFSETS[lcpIdx];
    const sectionTitleRow = rows[contentRowIdx - 1];
    // try {
      const sectionText = sectionTitleRow.children[0].innerText.toLowerCase().trim();
      if (lcp !== sectionText) {
        notify(`expecting '${lcp}' in row ${contentRowIdx}, got '${sectionText}'`, 'error');
      }
    // } catch {
    //   notify(`expecting '${lcp}' in row ${contentRowIdx}, couldn't read contents`, 'error');
    // }

    const dimensions = [...IMAGE_DIMENSIONS];
    if (sectionText === 'text') {
      dimensions[0] = [548, 334];
    }
    checkImages3(contentRowIdx, dimensions);
  })

  // check groups
  for (let grpIdx = 0; grpIdx < 4; grpIdx++) {
    const groupRowIdx = GRP_OFFSET[grpIdx];
    const groupRow = rows[groupRowIdx];
    const groupText = groupRow.children[0].innerText.toLowerCase().trim();
    const match = groupText.match(GROUP_REGEX)
    if (!match) {
      errors.push(`non conforming group title: ${groupText}`);
      return;
    }

    if (grpIdx === 0) {
      // remove background
    } else if (grpIdx === 2) {
      // change color
      checkHexColor(groupRowIdx + 1)
      checkHexColor(groupRowIdx + 2)
      checkHexColor(groupRowIdx + 3)
    } else {
      // change photo/pattern
      checkImages3(groupRowIdx + 1, THUMBNAILS_DIMENSIONS);
      checkImages3(groupRowIdx + 2, IMAGE_DIMENSIONS, );
      checkImages3(groupRowIdx + 3, IMAGE_DIMENSIONS_DESKTOPONLY, );
      checkImages3(groupRowIdx + 4, IMAGE_DIMENSIONS_DESKTOPONLY, );
    }
  }

  checkTextExact(TXT_OFFSET, 'additional text strings')
  checkTextAny(TXT_OFFSET + 1, '"Try It" localization')
}

export default function debug(el) {
  analyze(el);

  const debugContainer = document.createElement('div');
  debugContainer.className = 'debug';

  el.parentElement.append(debugContainer);
  debugContainer.append(el);

  debugContainer.append(notificationsContainer);

  errors.forEach(error => {
    notify(error, 'error');
  })


  if (notificationsContainer.children.length === 0) {
    notify("no errors", 'notice')
  }

}
