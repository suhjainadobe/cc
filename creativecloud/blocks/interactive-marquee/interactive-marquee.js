/* eslint-disable no-nested-ternary */
let excelLink = '';
const configObj = {};
const customElem = document.createElement('ft-changebackgroundmarquee');

function getImageSrc(node) {
  return Array.from(node).map((el) => {
    const a = el.querySelector('a');
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
  const childrenArr = objKeys === 'defaultBgSrc' ? processDataSet(dataSet[0]) : objKeys === 'talentSrc' ? processDataSet(dataSet[1]) : processDataSet(dataSet[2]);
  const getValueArr = getValue(childrenArr);
  return viewportType === 'desktop' ? getValueArr[2] : viewportType === 'tablet' ? getValueArr[1] : getValueArr[0];
}

function getTextItemValues(dataSet, viewportType, flag) {
  const childrenArr = processDataSet(dataSet);
  if (flag) childrenArr.shift();
  const getValueArr = getValue(childrenArr, 'text');
  return viewportType === 'desktop' ? getValueArr[2] : viewportType === 'tablet' ? getValueArr[1] : getValueArr[0];
}

function getIconAndName(dataSet, viewportType) {
  const childrenArr = processDataSet(dataSet);
  const objArr = [];
  const iconBlock = childrenArr.shift();
  objArr.iconUrl = iconBlock.innerText;
  objArr.name = getTextItemValues(dataSet, viewportType, true);
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
    viewportObj.tryitText = getTextItemValues(dataSet[3], viewportType);
    viewportObj.groups = [];
    for (let i = 4; i < dataSet.length - 1; i++) {
      const arr = getIconAndName(dataSet[i], viewportType);
      viewportObj.groups.push({ iconUrl: arr.iconUrl, name: arr.name });
    }
    configObj[viewportType] = viewportObj;
  }
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
    .filter((data) => data.ComponentName === name
    && data.Viewport === viewportType
    && data.MappedName === type)
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

export default async function init(el) {
  createConfig(el, configObj);
  const excelJsonData = await getExcelData(excelLink);
  createConfigExcel(excelJsonData, customElem.config);
  el.replaceWith(customElem);
}
