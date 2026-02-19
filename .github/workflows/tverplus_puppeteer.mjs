import puppeteer from "puppeteer";

const SERIES_CONTAINER_CLASS = "Series_container";
const SERIES_CONTENT_CLASS = "Series_info";
const SERIES_TITLE_CLASS = "Series_title";

const SERIES_URL = "https://tver.jp/series/sr2u73jipd";
const SERIES_TITLE = "あなたの番です";
const SERIES_FM_LINK = "https://filmarks.com/dramas/6055/8586";
const SERIES_FM_RATING = 4.0;
const SERIES_MDL_LINK = "https://mydramalist.com/33145-it-s-your-turn";
const SERIES_MDL_RATING = 8.0;

const USERSCRIPT_GITHUB_REPO = process.env.GITHUB_REPO || "e0406370/tverplus";
const USERSCRIPT_GITHUB_REF = process.env.GITHUB_REF || "main";
const USERSCRIPT_GITHUB_URL = `https://raw.githubusercontent.com/${USERSCRIPT_GITHUB_REPO}/${USERSCRIPT_GITHUB_REF}/tverplus.user.js`;

const isBrowserHeadless = true;
const retrieveSelectorClassStartsWith = (className) => `[class^="${className}"]`;
const logMessage = (message) => console.log(message);

(async () => {
  const browser = await puppeteer.launch({ headless: isBrowserHeadless });

  const page = await browser.newPage();
  page.setDefaultTimeout(15_000);
  logMessage(`Browser is launched with ${isBrowserHeadless ? "headless" : "headful"} mode`);

  await page.goto(SERIES_URL, { waitUntil: "networkidle0" });
  logMessage(`'${SERIES_URL}' is loaded`);

  const containerElement = await page.waitForSelector(retrieveSelectorClassStartsWith(SERIES_CONTAINER_CLASS));
  if (!containerElement) {
    throw new Error("Something is wrong with the container element")
  }
  logMessage(`Element with selector starting with '${SERIES_CONTAINER_CLASS}' is visible`);

  const contentElement = await containerElement.$(retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS));
  if (!contentElement) {
    throw new Error("Something is wrong with the content element");
  }
  logMessage(`Element with selector starting with '${SERIES_CONTENT_CLASS}' is visible`);

  const titleElement = await containerElement.$(retrieveSelectorClassStartsWith(SERIES_TITLE_CLASS));
  if (!titleElement) {
    throw new Error("Something is wrong with the title element");
  }
  logMessage(`Element with selector starting with '${SERIES_TITLE_CLASS}' is visible`);

  const titleText = await titleElement.evaluate(el => el.textContent);
  if (titleText != SERIES_TITLE) {
    throw new Error(`The title has changed: expected => ${SERIES_TITLE}, actual => ${titleText}`);
  }

  await page.addScriptTag({
    content: `
      window.GM = {
        async getValue(key) {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        },
        async setValue(key, value) {
          localStorage.setItem(key, JSON.stringify(value));
        },
      };
    `,
  });
  logMessage("TM-exclusive 'GM' polyfill is injected");

  await page.addScriptTag({
    content: await fetch(USERSCRIPT_GITHUB_URL).then(res => res.text()),
  });
  logMessage(`Userscript 'tverplus' is loaded from ${USERSCRIPT_GITHUB_URL}`);

  await contentElement.waitForSelector('a[href*=filmarks]')
    .then(async () => {
      const fm_link = await contentElement.$eval('a[href*=filmarks]', el => el.href);
      if (fm_link != SERIES_FM_LINK) {
        throw new Error(`[FM] The link has changed: expected => ${SERIES_FM_LINK}, actual => ${fm_link}`);
      }

      const fm_rating = Number.parseFloat(await contentElement.$eval('a[href*=filmarks] > span', el => el.textContent));
      if (fm_rating > SERIES_FM_RATING + 0.5 || fm_rating < SERIES_FM_RATING - 0.5) {
        throw new Error(`[FM] The rating has changed: expected => ${SERIES_FM_RATING}, actual => ${fm_rating}`);
      }

      logMessage(`[FM] Series data is injected: link => ${fm_link}, rating => ${fm_rating}`);
    });

  await contentElement.waitForSelector('a[href*=mydramalist]')
    .then(async () => {
      const mdl_link = await contentElement.$eval('a[href*=mydramalist]', el => el.href);
      if (mdl_link != SERIES_MDL_LINK) {
        throw new Error(`[MDL] The link has changed: expected => ${SERIES_MDL_LINK}, actual => ${mdl_link}`);
      }

      const mdl_rating = Number.parseFloat(await contentElement.$eval('a[href*=mydramalist] > span', el => el.textContent));
      if (mdl_rating > SERIES_MDL_RATING + 0.5 || mdl_rating < SERIES_MDL_RATING - 0.5) {
        throw new Error(`[MDL] The rating has changed: expected => ${SERIES_MDL_RATING}, actual => ${mdl_rating}`);
      }

      logMessage(`[MDL] Series data is injected: link => ${mdl_link}, rating => ${mdl_rating}`);
    });

  await browser.close();
})();
