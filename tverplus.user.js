// ==UserScript==
// @name         tverplus
// @namespace    tver
// @description  Adds Filmarks and MyDramaList ratings with links to their respective pages directly on TVer series pages. 1-1 matching is not guaranteed.
// @author       e0406370
// @match        https://tver.jp/*
// @version      2025-10-23
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
const FM_API_BASE_URLS = ["https://markuapi.vercel.app", "https://markuapi.apn.leapcell.app"];
const MDL_API_BASE_URLS = ["https://kuryana-kappa.vercel.app", "https://kuryana.tbdh.app"];
const MDL_DRAMA_TYPES = ["Japanese Drama", "Japanese TV Show"];

const retrieveSelectorClassStartsWith = (className) => `[class^=${className}]`;
const retrieveSeriesIDFromSeriesURL = (url) => (url.match(/sr[a-z0-9]{8,9}/) || [])[0] || null;
const isTimestampExpired = (timestamp) => timestamp < Date.now() - 7 * 24 * 60 * 60 * 10 ** 3;
const isEmptyObject = (obj) => Object.keys(obj).length === 0;

const getFMSearchDramasEndpoint = (url, query) => `${url}/search/dramas?q=${query}`;
const getMDLSearchDramasEndpoint = (url, query) => `${url}/search/q/${query}`;
const getMDLGetDramaInfoEndpoint = (url, slug) => `${url}/id/${slug}`;
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
  const seriesDataFM = {
    rating: "-",
    link: null,
    timestamp: Date.now(),
  };

  let toBreak = false;
  let urlPtr = 0;

  while (!toBreak && urlPtr < FM_API_BASE_URLS.length) {
    try {
      const url = getFMSearchDramasEndpoint(FM_API_BASE_URLS[urlPtr], title);
      const res = await Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('[FM] Search API request timeout')), 10000))
      ]);

      if (!res.ok) {
        throw new Error(`[FM] Search API error ${res.status} for ${title}`);
      }

      const data = await res.json();

      if (data.results.dramas.length === 0) {
        toBreak = true;
        throw new Error(`[FM] No results for ${title}`);
      }

      for (const [idx, drama] of data.results.dramas.entries()) {
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

      toBreak = true;
      throw new Error(`[FM] No 1-1 match found for ${title}`);
    }
    catch (err) {
      console.error(err);
      urlPtr++;
    }
  }

  return seriesDataFM;
}

async function retrieveSeriesDataMDL(title) {
  const seriesDataMDL = {
    rating: "N/A",
    link: null,
    timestamp: Date.now(),
  };

  let toBreak = false;
  let urlPtr = 0;

  while (!toBreak && urlPtr < MDL_API_BASE_URLS.length) {
    try {
      const searchUrl = getMDLSearchDramasEndpoint(MDL_API_BASE_URLS[urlPtr], normaliseTitle(title));
      const searchRes = await Promise.race([
        fetch(searchUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('[MDL] Search API request timeout')), 10000))
      ]);

      if (!searchRes.ok) {
        throw new Error(`[MDL] Search API error ${searchRes.status} for ${title}`);
      }

      const searchData = await searchRes.json();

      if (searchData.results.dramas.length === 0) {
        toBreak = true;
        throw new Error(`[MDL] No results for ${title}`);
      }

      let slug = null;

      for (const [idx, drama] of searchData.results.dramas.entries()) {
        if (idx === 3) break;

        if (MDL_DRAMA_TYPES.includes(drama.type)) {
          console.info(`[MDL] ${drama.title} | ${drama.year}`);

          slug = drama.slug;
          break;
        }
      }

      if (slug === null) {
        toBreak = true;
        throw new Error(`[MDL] No 1-1 match found for ${title}`);
      }

      const infoUrl = getMDLGetDramaInfoEndpoint(MDL_API_BASE_URLS[urlPtr], slug);
      const infoRes = await Promise.race([
        fetch(infoUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('[MDL] Info API request timeout')), 10000))
      ]);

      if (!infoRes.ok) {
        throw new Error(`[MDL] Info API error ${infoRes.status} for ${title}`);
      }

      const infoData = await infoRes.json();

      seriesDataMDL.rating = infoData.data.rating;
      seriesDataMDL.link = infoData.data.link;
      await GM.setValue(`${seriesID}-mdl`, JSON.stringify(seriesDataMDL));
      return seriesDataMDL;
    }
    catch (err) {
      console.error(err);
      urlPtr++;
    }
  }

  return seriesDataMDL;
}

function initSeriesElements() {
  for (let type of ["fm", "mdl"]) {
    let element = seriesElements[type];

    if (isEmptyObject(element)) {
      const dataContainer = document.createElement("div");
      const linkWrapper = document.createElement("a");
      const faviconLabel = document.createElement("img");
      const ratingLabel = document.createElement("span");
      const colorMode = document.querySelector("html").getAttribute("class");
      const loadingSpinner = document.createElement("img");

      dataContainer.appendChild(linkWrapper);
      linkWrapper.appendChild(faviconLabel);
      linkWrapper.appendChild(ratingLabel);

      element = {
        dataContainer: dataContainer,
        linkWrapper: linkWrapper,
        faviconLabel: faviconLabel,
        ratingLabel: ratingLabel,
        colorMode: colorMode,
        loadingSpinner: loadingSpinner,
      };

      seriesElements[type] = element;

      element.loadingSpinner.setAttribute("src", element.colorMode === "light" ? SPINNER_LIGHT_MODE : SPINNER_DARK_MODE);

      element.linkWrapper.style.color = element.colorMode === "light" ? "#000000" : "#ffffff";
      element.linkWrapper.style.display = "inline-flex";
      element.linkWrapper.style.alignItems = "center";
      element.linkWrapper.style.gap = "4px";

      element.faviconLabel.setAttribute("src", type === "fm" ? FM_FAVICON_URL : MDL_FAVICON_URL);
      element.faviconLabel.setAttribute("width", "24");
      element.faviconLabel.setAttribute("height", "24");
    }

    element.ratingLabel.textContent = "";
    element.ratingLabel.appendChild(element.loadingSpinner);

    element.linkWrapper.removeAttribute("href");
    element.linkWrapper.removeAttribute("target");
    element.linkWrapper.removeAttribute("rel");

    const contentContainer = document.querySelector(retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS));
    contentContainer.appendChild(element.dataContainer);
  }
}

function includeSeriesData(type) {
  const element = seriesElements[type];
  const data = seriesData[type];

  element.ratingLabel.removeChild(element.loadingSpinner);

  if (data.link) {
    element.linkWrapper.setAttribute("href", data.link);
    element.linkWrapper.setAttribute("target", "_blank");
    element.linkWrapper.setAttribute("rel", "noopener noreferrer");
  }

  element.ratingLabel.textContent
    = data.rating === (type === "fm" ? "-" : "N/A")
    ? data.link ? "N/A (✓)" : "N/A (✗)"
    : Number.parseFloat(seriesData[type].rating).toFixed(1);
}

function resetSeriesData() {
  seriesData.fm = {};
  seriesData.mdl = {};
  seriesElements.fm = {};
  seriesElements.mdl = {};
  seriesID = undefined;
  previousTitle = undefined;
}

function runScript() {
  waitForTitle()
    .then(async (title) => {
      initSeriesElements();

      const promiseFM = (async () => {
        const cachedFM = await GM.getValue(`${seriesID}-fm`);
        const parsedFM = cachedFM && JSON.parse(cachedFM);
        seriesData.fm
          = cachedFM && !isTimestampExpired(parsedFM.timestamp)
          ? parsedFM
          : await retrieveSeriesDataFM(title);

        includeSeriesData("fm");
      })().then(() => console.info(`[FM] Series data added for ${title}: ${JSON.stringify(seriesData.fm)}`));

      const promiseMDL = (async () => {
        const cachedMDL = await GM.getValue(`${seriesID}-mdl`);
        const parsedMDL = cachedMDL && JSON.parse(cachedMDL);
        seriesData.mdl
          = cachedMDL && !isTimestampExpired(parsedMDL.timestamp)
          ? parsedMDL
          : await retrieveSeriesDataMDL(title);

        includeSeriesData("mdl");
      })().then(() => console.info(`[MDL] Series data added for ${title}: ${JSON.stringify(seriesData.mdl)}`));
    });
}

function matchScript({ url }) {
  if (url.startsWith(TVER_SERIES_URL)) {
    seriesID = retrieveSeriesIDFromSeriesURL(location.href);

    if (seriesID) {
      runScript();
    }
    else {
      console.warn("Invalid series ID");
      resetSeriesData();
    }
  }
  else {
    resetSeriesData();
  }
}

matchScript({ url: location.href });

window.addEventListener("urlchange", matchScript);
