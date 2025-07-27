// ==UserScript==
// @name         tverplus
// @namespace    tver
// @description  Adds MyDramaList rating and link to the corresponding MyDramaList page directly on TVer series pages. 1-1 matching is not guaranteed.
// @author       e0406370
// @match        https://tver.jp/*
// @version      2025-07-27
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        window.onurlchange
// @noframes
// ==/UserScript==

const SERIES_TITLE_CLASS = "series-main_title";
const SERIES_CONTENT_CLASS = "series-main_content";
const TVER_SERIES_URL = "https://tver.jp/series/";
const MDL_API_BASE_URL = "https://kuryana.tbdh.app";
const MDL_FAVICON_URL = "https://raw.githubusercontent.com/e0406370/tverplus/refs/heads/assets/mdl_favicon.png";
const MDL_DRAMA_TYPES = ["Japanese Drama", "Japanese TV Show"];

const retrieveSelectorClassStartsWith = (className) => `[class^=${className}]`;
const retrieveSeriesIDFromSeriesURL = (url) => url.match("sr[a-z0-9]{8,9}")[0];
const isTimestampExpired = (timestamp) => timestamp < Date.now() - 7 * 24 * 60 * 60 * 10 ** 3;
const getMDLSearchDramasEndpoint = (query) => `${MDL_API_BASE_URL}/search/q/${query}`;
const getMDLGetDramaInfoEndpoint = (slug) => `${MDL_API_BASE_URL}/id/${slug}`
const normaliseMDLSearchQuery = (query) => query.replace("-", "").replace("Ｎ", "N");

let seriesID;
let seriesElements;
let previousTitle;

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
  let seriesData = {
    rating: "N/A",
    link: null,
    timestamp: Date.now(),
  };

  return fetch(getMDLSearchDramasEndpoint(normaliseMDLSearchQuery(title)))
    .then((res) => res.json())
    .then((data) => {
      if (data.results.dramas.length === 0) {
        throw new Error(`No results for ${title}`);
      }

      for (let i = 0; i < 3; i++) {
        const drama = data.results.dramas[i];

        if (MDL_DRAMA_TYPES.includes(drama.type)) {
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
    .then(async (data) => {
      seriesData.rating = data.data.rating;
      seriesData.link = data.data.link;
      await GM.setValue(`${seriesID}-${title}`, JSON.stringify(seriesData));
      return seriesData;
    })
    .catch((err) => {
      console.error(err);
      return seriesData;
    });
}

function initSeriesElements() {
  if (!seriesElements) {
    const dataContainer = document.createElement("div");
    const linkWrapper = document.createElement("a");
    const faviconLabel = document.createElement("img");
    const ratingLabel = document.createElement("span");

    dataContainer.appendChild(linkWrapper);
    linkWrapper.appendChild(faviconLabel);
    linkWrapper.appendChild(ratingLabel);

    seriesElements = {
      dataContainer: dataContainer,
      linkWrapper: linkWrapper,
      faviconLabel: faviconLabel,
      ratingLabel: ratingLabel,
    };

    seriesElements.linkWrapper.style.display = "inline-flex";
    seriesElements.linkWrapper.style.alignItems = "center";
    seriesElements.linkWrapper.style.gap = "4px";

    seriesElements.faviconLabel.setAttribute("src", MDL_FAVICON_URL);
    seriesElements.faviconLabel.setAttribute("width", "24");
    seriesElements.faviconLabel.setAttribute("height", "24");
  }

  seriesElements.linkWrapper.removeAttribute("href");
  seriesElements.linkWrapper.removeAttribute("target");
  seriesElements.linkWrapper.removeAttribute("rel");
  seriesElements.ratingLabel.textContent = "-";

  const contentContainer = document.querySelector(retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS));
  contentContainer.appendChild(seriesElements.dataContainer);
}

function includeSeriesData(data) {
  const mode = document.querySelector("html").getAttribute("class");
  const color = mode === "light" ? "#000000" : "#ffffff";

  if (data.link) {
    seriesElements.linkWrapper.setAttribute("href", data.link);
    seriesElements.linkWrapper.setAttribute("target", "_blank");
    seriesElements.linkWrapper.setAttribute("rel", "noopener noreferrer");
  }
  seriesElements.linkWrapper.style.color = color;
  seriesElements.ratingLabel.textContent = data.rating === "N/A" ? "N/A" : Number.parseFloat(data.rating).toFixed(1);
}

function runScript() {
  waitForTitle()
    .then(async (title) => {
      initSeriesElements();
      const cached = await GM.getValue(`${seriesID}-${title}`);
      const parsed = cached && JSON.parse(cached);
      return cached && !isTimestampExpired(parsed.timestamp) ? parsed : retrieveSeriesData(title);
    })
    .then((data) => {
      console.info(`${data.rating} | ${data.link}`);
      includeSeriesData(data);
    });
}

function matchScript({ url }) {
  if (url.startsWith(TVER_SERIES_URL)) {
    seriesID = retrieveSeriesIDFromSeriesURL(location.href);
    runScript();
  }
  else {
    seriesElements = undefined;
    previousTitle = undefined;
  }
}

// executes script upon reloading, opening in new tab / window, navigating via search bar
matchScript({ url: location.href });

// executes script upon url change as a result of interacting with pages (SPA)
window.addEventListener("urlchange", matchScript);
