// ==UserScript==
// @name         tverplus
// @namespace    tver
// @description  Adds Filmarks and MyDramaList ratings with links to their respective pages directly on TVer series pages. 1-1 matching is not guaranteed.
// @author       e0406370
// @match        https://tver.jp/*
// @version      2025-07-29
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        window.onurlchange
// @noframes
// ==/UserScript==

const SERIES_TITLE_CLASS = "series-main_title";
const SERIES_CONTENT_CLASS = "series-main_content";

const ASSETS_BASE_URL = "https://raw.githubusercontent.com/e0406370/tverplus/refs/heads/assets/";
const SPINNER_LIGHT_MODE = `${ASSETS_BASE_URL}spinner_light_mode.svg`;
const SPINNER_DARK_MODE = `${ASSETS_BASE_URL}spinner_dark_mode.svg`;
const FM_FAVICON_URL = `${ASSETS_BASE_URL}favicon_fm.png`;
const MDL_FAVICON_URL = `${ASSETS_BASE_URL}favicon_mdl.png`;

const TVER_SERIES_URL = "https://tver.jp/series/";
const FM_API_BASE_URL = "https://markuapi.onrender.com";
const MDL_API_BASE_URL = "https://kuryana.tbdh.app";
const MDL_DRAMA_TYPES = ["Japanese Drama", "Japanese TV Show"];

const retrieveSelectorClassStartsWith = (className) => `[class^=${className}]`;
const retrieveSeriesIDFromSeriesURL = (url) => url.match("sr[a-z0-9]{8,9}")[0];
const isTimestampExpired = (timestamp) => timestamp < Date.now() - 7 * 24 * 60 * 60 * 10 ** 3;
const isEmptyObject = (obj) => Object.keys(obj).length === 0;

const getFMSearchDramasEndpoint = (query) => `${FM_API_BASE_URL}/search/dramas/${query}`
const getMDLSearchDramasEndpoint = (query) => `${MDL_API_BASE_URL}/search/q/${query}`;
const getMDLGetDramaInfoEndpoint = (slug) => `${MDL_API_BASE_URL}/id/${slug}`
const normaliseTitle = (query) => query.replace(/[-–—−―]/g, "").replace(/[~～〜⁓∼˜˷﹏﹋]/g, "") .replace(/[\/／∕⁄]/g, "").replace(/[()（）]/g, "").replace(/\s/g, "").normalize("NFKC");

let seriesData = {
  fm: {},
  mdl: {},
};
let seriesElements = {
  fm: {},
  mdl: {},
};
let seriesID;
let previousTitle;

function waitForTitle() {
  const titleSelector = retrieveSelectorClassStartsWith(SERIES_TITLE_CLASS);
  const contentSelector = retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS);

  return new Promise((res) => {
    const isTitleReady = () => {
      const titleElement = document.querySelector(titleSelector);
      const contentElement = document.querySelector(contentSelector);
      return titleElement && contentElement && titleElement.textContent !== previousTitle;
    };

    if (isTitleReady()) {
      previousTitle = document.querySelector(titleSelector).textContent;
      return res(previousTitle);
    }

    const observer = new MutationObserver(() => {
      if (isTitleReady()) {
        previousTitle = document.querySelector(titleSelector).textContent;
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

async function retrieveSeriesDataFM(title) {
  let seriesDataFM = {
    rating: "-",
    link: null,
    timestamp: Date.now(),
  };

  return fetch(getFMSearchDramasEndpoint(title))
    .then((res) => {
      if (!res.ok) throw new Error(`[FM] Search API error ${res.status} for ${title}`);
      return res.json();
    })
    .then(async (data) => {
      if (data.dramas.length === 0) {
        throw new Error(`[FM] No results for ${title}`);
      }

      for (const [idx, drama] of data.dramas.entries()) {
        if (idx === 3) break;

        const titleSearch = normaliseTitle(title);
        const titleFM = normaliseTitle(drama.title);

        if (titleSearch.includes(titleFM) || titleFM.includes(titleSearch)) {
          console.info(`[FM] ${drama.title} | ${drama.rating}`);

          seriesDataFM.rating = drama.rating;
          seriesDataFM.link = drama.link;
          await GM.setValue(`${seriesID}-fm`, JSON.stringify(seriesDataFM));
          return seriesDataFM;
        }
      }

      throw new Error(`[FM] No 1-1 match found for ${title}`);
    })
    .catch((err) => {
      console.error(err);
      return seriesDataFM;
    });
}

async function retrieveSeriesDataMDL(title) {
  let seriesDataMDL = {
    rating: "N/A",
    link: null,
    timestamp: Date.now(),
  };

  return fetch(getMDLSearchDramasEndpoint(normaliseTitle(title)))
    .then((res) => {
      if (!res.ok) throw new Error(`[MDL] Search API error ${res.status} for ${title}`);
      return res.json();
    })
    .then((data) => {
      if (data.results.dramas.length === 0) {
        throw new Error(`[MDL] No results for ${title}`);
      }

      for (const [idx, drama] of data.results.dramas.entries()) {
        if (idx === 3) break;

        if (MDL_DRAMA_TYPES.includes(drama.type)) {
          console.info(`[MDL] ${drama.title} | ${drama.year}`);

          return drama.slug;
        }
      }

      throw new Error(`[MDL] No 1-1 match found for ${title}`);
    })
    .then((slug) => {
      return fetch(getMDLGetDramaInfoEndpoint(slug));
    })
    .then((res) => {
      if (!res.ok) throw new Error(`[MDL] Info API error ${res.status} for ${title}`);
      return res.json();
    })
    .then(async (data) => {
      seriesDataMDL.rating = data.data.rating;
      seriesDataMDL.link = data.data.link;
      await GM.setValue(`${seriesID}-mdl`, JSON.stringify(seriesDataMDL));
      return seriesDataMDL;
    })
    .catch((err) => {
      console.error(err);
      return seriesDataMDL;
    });
}

function initSeriesElements() {
  for (let type of ["fm", "mdl"]) {
    if (isEmptyObject(seriesElements[type])) {
      const dataContainer = document.createElement("div");
      const linkWrapper = document.createElement("a");
      const faviconLabel = document.createElement("img");
      const ratingLabel = document.createElement("span");
      const colorMode = document.querySelector("html").getAttribute("class");
      const loadingSpinner = document.createElement("img");

      dataContainer.appendChild(linkWrapper);
      linkWrapper.appendChild(faviconLabel);
      linkWrapper.appendChild(ratingLabel);

      seriesElements[type] = {
        dataContainer: dataContainer,
        linkWrapper: linkWrapper,
        faviconLabel: faviconLabel,
        ratingLabel: ratingLabel,
        colorMode: colorMode,
        loadingSpinner: loadingSpinner,
      };

      seriesElements[type].loadingSpinner.setAttribute("src", seriesElements[type].colorMode === "light" ? SPINNER_LIGHT_MODE : SPINNER_DARK_MODE);

      seriesElements[type].linkWrapper.style.color = seriesElements[type].colorMode === "light" ? "#000000" : "#ffffff";
      seriesElements[type].linkWrapper.style.display = "inline-flex";
      seriesElements[type].linkWrapper.style.alignItems = "center";
      seriesElements[type].linkWrapper.style.gap = "4px";

      seriesElements[type].faviconLabel.setAttribute("src", type === "fm" ? FM_FAVICON_URL : MDL_FAVICON_URL);
      seriesElements[type].faviconLabel.setAttribute("width", "24");
      seriesElements[type].faviconLabel.setAttribute("height", "24");
    }

    seriesElements[type].ratingLabel.textContent = "";
    seriesElements[type].ratingLabel.appendChild(seriesElements[type].loadingSpinner);

    seriesElements[type].linkWrapper.removeAttribute("href");
    seriesElements[type].linkWrapper.removeAttribute("target");
    seriesElements[type].linkWrapper.removeAttribute("rel");

    const contentContainer = document.querySelector(retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS));
    contentContainer.appendChild(seriesElements[type].dataContainer);
  }
}

function includeSeriesData() {
  for (let type of ["fm", "mdl"]) {
    seriesElements[type].ratingLabel.removeChild(seriesElements[type].loadingSpinner);

    if (seriesData[type].link) {
      seriesElements[type].linkWrapper.setAttribute("href", seriesData[type].link);
      seriesElements[type].linkWrapper.setAttribute("target", "_blank");
      seriesElements[type].linkWrapper.setAttribute("rel", "noopener noreferrer");
    }

    seriesElements[type].ratingLabel.textContent
      = seriesData[type].rating === (type === "fm" ? "-" : "N/A")
      ? "N/A"
      : Number.parseFloat(seriesData[type].rating).toFixed(1);
  }
}

function runScript() {
  waitForTitle()
    .then(async (title) => {
      initSeriesElements();

      const cachedFM = await GM.getValue(`${seriesID}-fm`);
      const parsedFM = cachedFM && JSON.parse(cachedFM);
      seriesData.fm = cachedFM && !isTimestampExpired(parsedFM.timestamp) ? parsedFM : await retrieveSeriesDataFM(title);

      const cachedMDL = await GM.getValue(`${seriesID}-mdl`);
      const parsedMDL = cachedMDL && JSON.parse(cachedMDL);
      seriesData.mdl = cachedMDL && !isTimestampExpired(parsedMDL.timestamp) ? parsedMDL : await retrieveSeriesDataMDL(title);
    })
    .then(() => {
      includeSeriesData();
    });
}

function matchScript({ url }) {
  if (url.startsWith(TVER_SERIES_URL)) {
    seriesID = retrieveSeriesIDFromSeriesURL(location.href);
    runScript();
  }
  else {
    seriesData.fm = {};
    seriesData.mdl = {};
    seriesElements.fm = {};
    seriesElements.mdl = {};
    previousTitle = undefined;
  }
}

matchScript({ url: location.href });

window.addEventListener("urlchange", matchScript);
