### Purpose

This userscript injects the corresponding [MyDramaList](https://mydramalist.com/699035-tokyo-mer) rating and link into a [TVer series](https://tver.jp/series/srwttibvhk) page, with support from the [Tampermonkey](https://www.tampermonkey.net/) browser extension. 

It aims for the best possible 1-to-1 matching accuracy despite the limitations described in [GH-8](https://github.com/e0406370/tverplus/issues/8).

Using the script allows users to instantly view the rating and directly access the associated MyDramaList page, eliminating the need to navigate away from TVer and searching for it manually via another method.

There are plans to incorporate [Filmarks](https://filmarks.com/dramas/10640/14824) as an additional data source, but the required API endpoints will have to be created from scratch first.

![demo](https://raw.githubusercontent.com/e0406370/tverplus/refs/heads/assets/gh_7_demo.gif)

### Setup

1. Install the Tampermonkey extension for your browser [here](https://www.tampermonkey.net/).

2. After installing, visit the Extensions page and then click `Details` for the Tampermonkey extension, followed by enabling the `Allow user scripts` option as well as `Developer mode` located on the top right corner.

3. Navigate to this [link](https://github.com/e0406370/tverplus/raw/refs/heads/main/tverplus.user.js) and follow the on-screen instructions to install the userscript. If this method does not work, see steps 4 and 5 for an alternative method. Otherwise, proceed to step 6 after this step is completed.
  
4. Open the Extensions tab located on the right of the address bar and then click on the Tampermonkey logo, followed by the `Create a new script...` button.

5. Copy and paste this [userscript](tverplus.user.js) into the editor and then press `CTRL + S` to save the script into the dashboard.

6. The `tverplus` script should now appear on the dashboard. For additional information on installing scripts in Tampermonkey, refer to this [guide](https://www.tampermonkey.net/faq.php?locale=en#Q102).

7. Access a [valid](https://tver.jp/series/srwttibvhk) TVer series page `[https://tver.jp/series/*]`, and the script should execute.

https://github.com/user-attachments/assets/d9673911-36bb-4d56-9c0a-88a6f9e01d50