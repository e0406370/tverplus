### Purpose

This userscript injects the corresponding [MyDramaList](https://mydramalist.com/699035-tokyo-mer) rating and link into a [TVer series](https://tver.jp/series/srwttibvhk) page, with support from the [Tampermonkey](https://www.tampermonkey.net/) browser extension. 

It aims for the best possible 1-to-1 matching accuracy despite the limitations described in [GH-8](https://github.com/e0406370/tverplus/issues/8).

Using the script allows users to instantly view the rating and directly access the associated MyDramaList page, eliminating the need to navigate away from TVer and searching for it manually via another method.

There are plans to incorporate [Filmarks](https://filmarks.com/dramas/10640/14824) as an additional data source, but the required API endpoints will have to be created from scratch first.

![demo](https://raw.githubusercontent.com/e0406370/tverplus/refs/heads/assets/gh_7_demo.gif)

### Setup

1. Install the Tampermonkey extension for your browser [here](https://www.tampermonkey.net/).

2. After installing, visit the Extensions [page](chrome://extensions/) and then click `Details` for the Tampermonkey extension, followed by enabling the `Allow user scripts` option as well as `Developer mode` located on the top right corner.
  
3. Open the Extensions tab located on the right of the address bar and then click on the Tampermonkey logo in the Extensions tab, followed by clicking the `Create a new script...` button.

4. Copy and paste this [userscript](tverplus.user.js) into the editor and then press `CTRL + S` to save the script into the dashboard.

5. The `tverplus` script should now appear in the dashboard. To learn more about installing scripts to Tampermonkey, refer to this [guide](https://www.tampermonkey.net/faq.php?locale=en#Q102).

6. Access a [valid](https://tver.jp/series/srwttibvhk) TVer series page `[https://tver.jp/series/*]`, and the script should execute.

https://github.com/user-attachments/assets/d9673911-36bb-4d56-9c0a-88a6f9e01d50