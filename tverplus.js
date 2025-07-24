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

const SERIES_TITLE_CLASS = "series-main_title";
const SERIES_CONTENT_CLASS = "series-main_content";
const MDL_API_BASE_URL = "https://kuryana.tbdh.app";

const retrieveSelectorClassStartsWith = (className) => `[class^=${className}]`;
const getMDLSearchDramasEndpoint = (query) => `${MDL_API_BASE_URL}/search/q/${query}`;
const getMDLGetDramaInfoEndpoint = (slug) => `${MDL_API_BASE_URL}/id/${slug}`

let previousTitle;
let previousUrl;

function waitForTitle() {
  let titleSelector = retrieveSelectorClassStartsWith(SERIES_TITLE_CLASS);
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

function retrieveSeriesData(title) {
  fetch(getMDLSearchDramasEndpoint(title))
    .then((res) => res.json())
    .then((data) => {
      for (let i = 0; i < 3; i++) {
        const drama = data.results.dramas[i];

        if (drama.type === "Japanese Drama" || drama.type === "Japanese Special") {
          console.info(`${drama.title} + ${drama.year}`);
          return drama.slug;
        }
      }
    })
    .then((slug) => {
      return fetch(getMDLGetDramaInfoEndpoint(slug));
    })
    .then((res) => res.json())
    .then((data) => {
      const rating = data.data.rating;
      const link = data.data.link;

      console.info(`${rating} + ${link}`);
      return { rating, link };
    })
}

function runScript() {
  let rating;
  let link;

  waitForTitle().then((title) => {
    console.info(title);
    retrieveSeriesData(title);
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
