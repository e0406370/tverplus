import puppeteer from "puppeteer";

const URL = "https://tver.jp/series/sr2u73jipd";
const TITLE = "あなたの番です";

const SERIES_CONTAINER_CLASS = "series-page-main_container";
const SERIES_CONTENT_CLASS = "series-main_content";
const SERIES_TITLE_CLASS = "series-main_title";

const retrieveSelectorClassStartsWith = (className) => `[class^="${className}"]`;
const logMessage = (message) => console.log(message);

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle0" });
  logMessage(`'${URL}' is loaded.`);

  await page.waitForSelector(retrieveSelectorClassStartsWith(SERIES_CONTAINER_CLASS));
  logMessage(`Element with selector starting with '${SERIES_CONTAINER_CLASS}' is loaded.`);

  const contentElement = await page.$(retrieveSelectorClassStartsWith(SERIES_CONTENT_CLASS));
  logMessage(`Element with selector starting with '${SERIES_CONTENT_CLASS}' is visible.`);
  if (!contentElement) {
    logMessage("Something is wrong with the content element!");
  }

  const titleElement = await page.$(retrieveSelectorClassStartsWith(SERIES_TITLE_CLASS));
  logMessage(`Element with selector starting with '${SERIES_TITLE_CLASS}' is visible.`);
  if (!titleElement) {
    logMessage("Something is wrong with the title element!");
  }

  const titleText = await page.evaluate(el => el.textContent, titleElement);
  if (titleText != TITLE) {
    logMessage(`
      The title has changed: 
      expected => ${TITLE}
      actual => ${titleText}
    `);
  }

  await browser.close();
})();
