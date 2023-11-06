let excelLink = '';
let configObj = {};
const base = `${window.location.origin}/creativecloud`;
const assetsRoot = `${base}/assets`;
const customElem = document.createElement('ft-changebackgroundmarquee');
const defaultBgLInk = [];

function getImageSrc(node) {
  return Array.from(node).map((el) => {
    const a = el.querySelector('a');
    //   const img = a.querySelector('source');
    return a.href;
  });
}
  

function getText(node) {
  return Array.from(node).map((el) => el.innerText.trim());
}

function getValue(childrenArr, type) {
  const valueArr = type === 'img' ? getImageSrc(childrenArr) : getText(childrenArr);
  let newData = [];
  if (valueArr.length === 1) {
    newData = [valueArr[0], valueArr[0], valueArr[0]];
  } else if (valueArr.length === 2) {
    newData = [valueArr[0], valueArr[0], valueArr[1]];
  } else {
    newData = [valueArr[0], valueArr[1], valueArr[2]];
  }
  return newData;
}

function processDataSet(dataSet) {
  const { children } = dataSet;
  const childrenArr = [...children];
  return childrenArr;
}

function getImageUrlValues(dataSet, objKeys, viewportType) {
  let childrenArr = '';
  if (objKeys === 'defaultBgSrc') {
    childrenArr = processDataSet(dataSet[0]);
  } else if (objKeys === 'talentSrc') {
    childrenArr = processDataSet(dataSet[1]);
  } else if (objKeys === 'marqueeTitleImgSrc') {
    childrenArr = processDataSet(dataSet[2]);
  }
  const getValueArr = getValue(childrenArr);
  if (viewportType === 'desktop') {
    return getValueArr[2];
  } else if (viewportType === 'tablet') {
    return getValueArr[1];
  }
  return getValueArr[0];
}

function getTextItemValues(dataSet, viewportType, flag) {
  const childrenArr = processDataSet(dataSet);
  if (flag) {
    childrenArr.shift();
  }
  const getValueArr = getValue(childrenArr, 'text');
  if (viewportType === 'desktop') {
    return getValueArr[2];
  } else if (viewportType === 'tablet') {
    return getValueArr[1];
  }
  return getValueArr[0];
}

function getIconAndName(dataSet, viewportType) {
  const childrenArr = processDataSet(dataSet);
  const objArr = [];
  const iconBlock = childrenArr.shift();
  console.log('iconBlock', iconBlock);
  objArr['iconUrl'] = iconBlock.innerText;
  objArr['name'] = getTextItemValues(dataSet, viewportType, true);
  return objArr;
}

async function createConfig(el) {
  customElem.config = configObj;
  const dataSet = el.querySelectorAll(':scope > div');
  for (const viewportType of ['mobile', 'tablet', 'desktop']) {
    const viewportObj = {};
    for (const objKeys of ['defaultBgSrc', 'talentSrc', 'marqueeTitleImgSrc']) {
      viewportObj[objKeys] = getImageUrlValues(dataSet, objKeys, viewportType);
    }
    viewportObj['tryitText'] = getTextItemValues(dataSet[3], viewportType);
    viewportObj['groups'] = [];
    for (let i = 4; i < dataSet.length - 1; i++) {
      const arr = getIconAndName(dataSet[i], viewportType);
      viewportObj.groups.push({'iconUrl': arr.iconUrl, 'name': arr.name});
    }
    // TODO: uncomment when needed
    configObj[viewportType] = viewportObj;
  }
  // customElem.config = configObj;
  excelLink = dataSet[dataSet.length - 1].innerText.trim();
}

async function getExcelData(link) {
  const resp = await fetch(link);
  const { data } = await resp.json();
  return data.map((grp) => grp);
}

function getExcelDataCursor(excelJson, type) {
  const foundData = excelJson.find((data) => data.MappedName === type);
  return foundData ? foundData.Value1 : null;
}

function getSrcFromExcelData(name, viewportType, excelData, type) {
  return excelData
    .filter((data) => data.MenuName === name && data.Viewport === viewportType && data.MappedName === type)
    .flatMap((data) => [data.Value1, data.Value2, data.Value3].filter((value) => value.trim() !== ''));
}

function createConfigExcel(excelJson, configObjData) {
  const viewportTypes = ['desktop', 'tablet', 'mobile'];
  for (const viewportType of viewportTypes) {
    configObjData[viewportType].tryitSrc = getExcelDataCursor(excelJson, 'tryitSrc');
    if (viewportType == 'desktop') {
      configObjData[viewportType].cursorSrc = getExcelDataCursor(excelJson, 'cursorSrc');
    }
    const existingGroups = configObjData[viewportType].groups;
    for (const group of existingGroups) {
      const name = group.name;
      const groupsrc = getSrcFromExcelData(name, viewportType, excelJson, 'src');
      const groupswatchSrc = getSrcFromExcelData(name, viewportType, excelJson, 'swatchSrc');
      group.options = [];
      for (let i = 0; i < groupsrc.length; i++) {
        const option = { src: groupsrc[i] };
        if (groupswatchSrc[i]) option.swatchSrc = groupswatchSrc[i];
        group.options.push(option);
      }
      if (group.options.length === 0) {
        delete group.options;
      }
    }
  }
}

function configExcelData(jsonData) {
  console.log('jsonData', jsonData);
  // const rearrangedData = {};customElem.config = configObj;
  customElem.config = configObj;
  jsonData.forEach((item) => {
    const { Viewport, MappedName, Value1, MenuName } = item;
    if (Viewport && MappedName && Value1) {
      if (!configObj[Viewport]) {
        configObj[Viewport] = {};
        configObj[Viewport]['groups'] = [];
      }
      if (MappedName !== 'iconUrl' && MappedName !== 'src' && MappedName !== 'swatchSrc') {
        configObj[Viewport][MappedName] = Value1;
      } else if (MappedName === 'iconUrl') {
        const obj = {};
        obj['name'] = MenuName;
        obj[MappedName] = Value1;
        configObj[Viewport]['groups'].push(obj);
      }
    }
  });
  console.log('rearrangedData', configObj);
  // return rearrangedData;
}

export default async function init(el) {
  // import(`${base}/deps/interactive-marquee-changebg/ft-everyonechangebgmarquee-8e121e97.js`);
  console.log('el', el);
  const clone = el.cloneNode(true);
  const firstDiv = el.querySelectorAll(':scope > div');
  const firstThreeDivs = Array.prototype.slice.call(firstDiv, 0, 3);
  [...firstThreeDivs].forEach((ele) => {
    const d = ele.querySelector('div');
    const img = new Image();
    img.fetchPriority = 'high';
    img.src = `${d.innerText}`;
    console.log('img', img);
  });
  excelLink = firstDiv[0].innerText.trim();
  console.log('excelLink',excelLink);
  const excelJsonData = await getExcelData(excelLink);
  configExcelData(excelJsonData);
  createConfigExcel(excelJsonData, customElem.config);
  console.log('rearrangedData', configObj);
  el.replaceWith(customElem);
}