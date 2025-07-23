// ==UserScript==
// @name         tverplus
// @namespace    tver
// @description  Adds MyDramaList rating and link to the corresponding MyDramaList page directly on TVer series pages. 1-1 matching is not guaranteed.
// @author       e0406370
// @include      https://tver.jp/series/*
// @version      2025-07-23
// @grant        none
// ==/UserScript==

class Constants {
  static get seriesTitleClass() {
    return "series-main_title";
  }

  static get seriesContentClass() {
    return "series-main_content";
  }
}
Object.freeze(Constants);

class Utils {
  static retrieveSelectorClassStartsWith(className) {
    return `[class^=${className}]`;
  }
}
Object.freeze(Utils);


function waitForTitle() {
  let titleSelector = Utils.retrieveSelectorClassStartsWith(Constants.seriesTitleClass);
  let fetchTitleElement = function () { return document.querySelector(titleSelector); };

  return new Promise((res) => {
    let titleElement = fetchTitleElement();
    if (titleElement) {
      return res(titleElement.textContent);
    }

    const observer = new MutationObserver(() => {
      let titleElement = fetchTitleElement();
      if (titleElement) {
        observer.disconnect();
        res(titleElement.textContent);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function init() {
  let title;

  waitForTitle().then((res) => {
    console.info(res);
    title = res;
  });
}

init();
