// ==UserScript==
// @name         tverplus
// @namespace    tver
// @description  Adds MyDramaList rating and link to the corresponding MyDramaList page directly on TVer series pages. 1-1 matching is not guaranteed.
// @author       e0406370
// @match        https://tver.jp/*
// @version      2025-07-23
// @grant        window.onurlchange
// @noframes
// ==/UserScript==

const seriesTitleClass = "series-main_title";
const seriesContentClass = "series-main_content";

let previousTitle;
let previousUrl;

class Utils {
  static retrieveSelectorClassStartsWith(className) {
    return `[class^=${className}]`;
  }
}
Object.freeze(Utils);

function waitForTitle() {
  let titleSelector = Utils.retrieveSelectorClassStartsWith(seriesTitleClass);
  let fetchTitleElement = function () { return document.querySelector(titleSelector); };

  return new Promise((res) => {
    let titleElement = fetchTitleElement();
    if (titleElement && titleElement.textContent !== previousTitle) {
      previousTitle = titleElement.textContent;
      return res(previousTitle);
    }

    const observer = new MutationObserver(() => {
      let titleElement = fetchTitleElement();
      if (titleElement && titleElement.textContent !== previousTitle) {
        previousTitle = titleElement.textContent;
        observer.disconnect();
        res(previousTitle);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function runScript() {
  waitForTitle().then((title) => {
    console.info(title);
    return title;
  });
}

function matchScript({ url }) {
  if (url.startsWith("https://tver.jp/series/")) {
    if (previousUrl && previousUrl === location.href) {
      return;
    }
    previousUrl = location.href;
    runScript();
  }
  else {
    previousUrl = undefined;
  }
}

// executes script upon reloading, opening in new tab / window, navigating via search bar
matchScript({ url: location.href });

// executes script upon url change as a result of interacting with pages (SPA)
window.addEventListener("urlchange", matchScript);
