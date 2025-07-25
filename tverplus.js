// ==UserScript==
// @name         tverplus
// @namespace    tver
// @description  Adds MyDramaList rating and link to the corresponding MyDramaList page directly on TVer series pages. 1-1 matching is not guaranteed.
// @author       e0406370
// @match        https://tver.jp/*
// @version      2025-07-24
// @grant        window.onurlchange
// @noframes
// ==/UserScript==

const SERIES_TITLE_CLASS = "series-main_title";
const SERIES_CONTENT_CLASS = "series-main_content";
const TVER_SERIES_URL = "https://tver.jp/series/";
const MDL_API_BASE_URL = "https://kuryana.tbdh.app";
const MDL_FAVICON_URL = "https://raw.githubusercontent.com/e0406370/tverplus/refs/heads/assets/mdl_favicon.png";

const retrieveSelectorClassStartsWith = (className) => `[class^=${className}]`;
const getMDLSearchDramasEndpoint = (query) => `${MDL_API_BASE_URL}/search/q/${query}`;
const getMDLGetDramaInfoEndpoint = (slug) => `${MDL_API_BASE_URL}/id/${slug}`

let previousTitle;
let previousUrl;

function waitForTitle() {
  const titleSelector = retrieveSelectorClassStartsWith(SERIES_TITLE_CLASS);
  const fetchTitleElement = () => { return document.querySelector(titleSelector); };

  return new Promise((res) => {
    const titleElement = fetchTitleElement();
    if (titleElement && titleElement.textContent !== previousTitle) {
      previousTitle = titleElement.textContent;
      return res(previousTitle);
    }

    const observer = new MutationObserver(() => {
      const titleElement = fetchTitleElement();
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
  let rating;
  let link;

  return fetch(getMDLSearchDramasEndpoint(title))
    .then((res) => res.json())
    .then((data) => {
      if (data.results.dramas.length === 0) {
        throw new Error(`No results for ${title}`);
      }

      for (let i = 0; i < 3; i++) {
        const drama = data.results.dramas[i];

        if (drama.type === "Japanese Drama") {
          console.info(`${drama.title} | ${drama.year}`);
          return drama.slug;
        }
      }

      throw new Error(`No 1-1 match found for ${title}`);
    })
    .then((slug) => {
      return fetch(getMDLGetDramaInfoEndpoint(slug));
    })
    .then((res) => res.json())
    .then((data) => {
      rating = data.data.rating;
      link = data.data.link;
      return { rating, link };
    })
    .catch((err) => {
      console.error(err);
      rating = "N/A";
      link = null;
      return { rating, link };
    })
}

function includeSeriesData(data) {
  const mode = document.querySelector("html").getAttribute("class");
  const color = mode === "light" ? "#000000" : "#ffffff";

  const contentContainer = document.querySelector(retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS));
  const dataContainer = document.createElement("div");
  contentContainer.appendChild(dataContainer);

  const linkWrapper = document.createElement(data.link ? "a" : "div");
  if (data.link) {
    linkWrapper.setAttribute("href", data.link);
    linkWrapper.setAttribute("target", "_blank");
    linkWrapper.setAttribute("rel", "noopener noreferrer");
  }
  linkWrapper.style.color = color;
  linkWrapper.style.display = "inline-flex";
  linkWrapper.style.alignItems = "center";
  linkWrapper.style.gap = "4px";
  dataContainer.appendChild(linkWrapper);

  const faviconLabel = document.createElement("img");
  faviconLabel.setAttribute("src", MDL_FAVICON_URL);
  faviconLabel.setAttribute("width", "24");
  faviconLabel.setAttribute("height", "24");
  linkWrapper.appendChild(faviconLabel);

  const ratingLabel = document.createElement("span");
  ratingLabel.textContent = data.rating === "N/A" ? "N/A" : Number.parseFloat(data.rating).toFixed(1);
  linkWrapper.appendChild(ratingLabel);
}

function runScript() {
  waitForTitle()
    .then((title) => {
      console.info(title);
      return retrieveSeriesData(title);
    })
    .then((data) => {
      console.info(`${data.rating} | ${data.link}`);
      includeSeriesData(data);
    });
}

function matchScript({ url }) {
  if (url.startsWith(TVER_SERIES_URL)) {
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
