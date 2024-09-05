import { elementConstant } from './elementConstant.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractInfo") {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: extractInformation,
      args: [elementConstant],
    });

    // Return true to indicate you want to send a response asynchronously
    return true;
  }
});

async function extractInformation(elementConstant) {
  debugger;
  var self = this;
  self._element = elementConstant;
  const tabConstant = {
    general: 0,
    review: 1,
    introduce: 2,
  };

  // Utility function to wait for an element to appear
  function waitForElement(
    selector,
    hasChild = false,
    waitTime = 5000,
    timeout = 10000,
    interval = 500
  ) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (selector) {
          const element = document.querySelector(selector);

          // check the condition to determine that element already displayed
          if (element && (!hasChild || element.hasChildNodes())) {
            clearInterval(checkInterval);
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(
              `Timeout: Element ${selector} not found within ${timeout}ms`
            );
          }
        } else {
          if (Date.now() - startTime > waitTime) {
            resolve();
          }
        }
      }, interval);
    });
  }

  function waitForElementInvisible(selector, timeout = 10000, interval = 500) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        const element = document.querySelector(selector);
        // check the condition to determine that element already displayed
        if (!element) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(
            `Timeout: Element ${selector} not disspear within ${timeout}ms`
          );
        }
      }, interval);
    });
  }

  async function switchToTab(index, waitForSelector) {
    const tabLists = document.querySelector(self._element.location_container.fourth_parent.tab.element)?.childNodes;
    tabLists[index].click();
    await waitForElement(waitForSelector);
  }

  function extractCoordinates(url) {
    // Use a regular expression to match the part of the URL that contains the coordinates and zoom level
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);

    if (match) {
      // Extract latitude, longitude, and zoom level from the match groups
      const latitude = match[1];
      const longitude = match[2];

      return {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    } else {
      return { latitude: null, longitude: null }; // Return null
    }
  }

  function extractAddressDetails(address) {
    if (!address)
      return { street: "", ward: "", district: "", city: "", country: "" };

    const parts = address.split(",")?.map((part) => part?.trim());
    // Street Number and Name, Ward, District, City, Country
    const street = parts[0] || null;
    const ward = parts[1] || null;
    const district = parts[2] || null;
    const city = parts[3] || null;
    const country = parts[4] || null;

    return {
      street,
      ward,
      district,
      city,
      country,
    };
  }

  function extractAddress(currentUrl) {
    const address =
      document
        .querySelector('[data-item-id="address"]')
        ?.querySelector(".Io6YTe")?.innerText || "";
    const { latitude, longitude } = extractCoordinates(currentUrl);

    const { street, ward, district, city, country } =
      extractAddressDetails(address);

    return { street, ward, district, city, country, latitude, longitude };
  }

  async function generalInformation() {
    debugger;
    // wait for the tab to be activate
    const generalElement = self._element.location_container.fourth_parent.location.name;
    if (!document.querySelector(generalElement)) {
      await switchToTab(tabConstant.general, generalElement); // Wait for the location element
    }

    const currentUrl = window.location.href;
    const address = extractAddress(currentUrl);

    const category = document.querySelector(self._element.location_container.fourth_parent.location.category)?.innerText || '';

    const location = document.querySelector(generalElement)?.innerText;
    const totalRating = document.querySelector(self._element.location_container.fourth_parent.location.rating)?.innerText || 0;

    // Select all rows in the table that contains the opening hours information
    const openingHoursRows = document.querySelectorAll("tr.y0skZc");

    let openingHours = [];

    openingHoursRows.forEach((row) => {
      const day = row.querySelector("td.ylH6lf div")?.innerText || "";
      const hours = row.querySelector("td.mxowUb li.G8aQO")?.innerText || "";
      openingHours.push({ day, hours });
    });

    const webSite =
      document.querySelector(".rogA2c.ITvuef .fontBodyMedium")?.innerText || "";
    const phoneNumber =
      document
        .querySelector('[data-item-id^="phone:tel:"]')
        ?.querySelector(".Io6YTe.fontBodyMedium")?.innerText || "";

    var albumImages = await getAlbumImage();

    // back to previous tab after get all of image in album
    document.querySelector("#omnibox-singlebox .hYBOP.FeXq4d").click();
    await waitForElementInvisible('div[class="google-symbols G47vBd"]');

    return {
      currentUrl,
      location,
      category, 
      albumImages,
      totalRating,
      address,
      openingHours,
      webSite,
      phoneNumber,
    };
  }

  async function getAlbumImage() {
    const thumbnail = document.querySelector(".RZ66Rb.FgCUCc img");
    thumbnail.click();
    await waitForElement("#omnibox-singlebox");

    const imageAreaElement = ".k7jAl.miFGmb.lJ3Kh.PLbyfe";
    const imageArea = await waitForElement(imageAreaElement);
    
    const imageChildNodes = imageArea
      ?.querySelector(".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde")
      ?.querySelector(".m6QErb.XiKgde")?.childNodes;

    let images = [];
    for (let i = 0; i < imageChildNodes.length; i++) {
      let image = imageChildNodes[i]?.querySelector(".U39Pmb");
      const imageUrl = regexImageUrl(image);
      if (imageUrl) {
        images.push(imageUrl);
      }
    }

    return images;
  }

  function getTotalReview() {
    const totalReviewText = document.querySelector(
      ".PPCwl .fontBodySmall"
    )?.innerText;
    const regex = /\d+/;
    const match = totalReviewText.match(regex);
    return match ? match[0] : 0;
  }

  async function sortByLatestComment() {
    // filter latest review
    const sortByElement = document.querySelector(
      'div[class="m6QErb Hk4XGb XiKgde tLjsW "] button'
    );
    sortByElement.click();

    // dropdown sort by
    await waitForElement(".fontBodyLarge.yu5kgd.vij30.kA9KIf");

    const sortByLatestOption = document
      .querySelector(".fontBodyLarge.yu5kgd.vij30.kA9KIf")
      ?.querySelector('div[data-index="1"]');
    sortByLatestOption.click();
  }

  async function expandComment(commentElement) {
    const expanReviewElement = commentElement?.querySelector(
      "button.w8nwRe.kyuRq"
    );
    if (expanReviewElement) {
      expanReviewElement.click();
      const dataReviewId = expanReviewElement.getAttribute("data-review-id");
      await waitForElementInvisible(
        ".MyEned button[data-review-id=" + dataReviewId + "]"
      );
    }
  }

  async function getReviews() {
    // wait for the tab to be activate
    const reviewTab = document.querySelector('button[data-tab-index="1"]');
    if (!reviewTab) return;

    const reviewAreaElement = ".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde";
    if (!reviewTab.classList.contains("G7m0Af")) {
      await switchToTab(tabConstant.review, reviewAreaElement);
    }

    // sort comment by latest
    await sortByLatestComment();

    // wait for review list are display
    const reviewListElement = 'div[class="m6QErb XiKgde "]';
    await waitForElement(reviewListElement, true);

    let reviews = [];
    const reviewArea = document.querySelector(reviewAreaElement);
    const reviewList = reviewArea?.querySelector(reviewListElement);
    var reviewNodes = reviewList.querySelectorAll(".fontBodyMedium");

    const limit = getTotalReview();

    for (let i = 0; i < limit; i++) {
      let reviewNode = reviewNodes[i];

      // in case element not available => try to load more element
      if (!reviewNode) {
        reviewNodes = await loadMoreReviewNodes(
          reviewArea,
          reviewListElement,
          limit
        );
        reviewNode = reviewNodes[i];
      }

      const user =
        reviewNode.querySelector(".d4r55")?.innerText || "Unknown User";
      const rating =
        reviewNode
          .querySelector('span[class*="kvMYJc"]')
          ?.querySelectorAll(".elGi1d")?.length || "0";

      // There are 2 type of comment structure
      // 1 - display inside of div has class .MyEned
      // 2 - display with child nodes in a div without any id or class
      let commentElement = reviewNode.querySelector(".MyEned");
      if (!commentElement) {
        commentElement = reviewNode.querySelector(".DU9Pgb").nextSibling;
      }

      // expan comment if too log
      await expandComment(commentElement);

      const comment = commentElement?.innerText || "";
      const commentTime = reviewNode.querySelector(".rsqaWe")?.innerText || "";

      const images = extractImages(reviewNode);

      reviews.push({ user, rating, comment, commentTime, images });
    }

    return reviews;
  }

  async function loadMoreReviewNodes(
    reviewArea,
    reviewListElement,
    numberOfComment
  ) {
    const reviewList = reviewArea?.querySelector(reviewListElement);
    let reviewNodes = [];
    let previousScrollHeight;

    // Scroll to the bottom of the review area
    reviewArea.scrollTop = reviewArea.scrollHeight;

    // Wait for the scroll and lazy load to finish
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (reviewArea.scrollHeight === previousScrollHeight) {
          clearInterval(interval);
          resolve();
        } else {
          previousScrollHeight = reviewArea.scrollHeight;
        }
      }, 500); // Check every 500 milliseconds
    });

    // Update review nodes
    reviewNodes = reviewList.querySelectorAll(".fontBodyMedium");

    // If not enough review nodes are loaded, call the function recursively
    if (reviewNodes.length < numberOfComment) {
      return loadMoreReviewNodes(
        reviewArea,
        reviewListElement,
        numberOfComment
      );
    }

    return reviewNodes;
  }

  async function getIntroduction() {
    const introductionTab = document.querySelector(
      'button[data-tab-index="2"]'
    );
    if (!introductionTab) return "";

    const introductionArea = ".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde";
    if (!introductionTab.classList.contains("G7m0Af")) {
      await switchToTab(tabConstant.introduce, introductionArea);
    }

    const introductions = document
      .querySelector(introductionArea)
      ?.querySelectorAll(".fontBodyMedium");

    if (introductions.length > 0) {
      return Array.from(introductions)
        .map((node) => node.innerHTML?.replace(/\s*class="[^"]*"/g, ""))
        .join("");
    }

    return "";
  }

  function regexImageUrl(el) {
    const style = el.getAttribute("style");
    const urlMatch = style.match(/url\("([^"]+)"\)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    return "";
  }

  function extractImages(el) {
    const imageElements = el.querySelector(".KtCyie")?.childNodes;
    const images = [];
    if (imageElements && imageElements.length > 0) {
      for (let i = 0; i < imageElements.length; i++) {
        const el = imageElements[i];
        const image = regexImageUrl(el);
        if (image) {
          images.push(image);
        }
      }
    }

    return images;
  }

  async function main() {
    const {
      currentUrl,
      location,
      category,
      albumImages,
      totalRating,
      address,
      openingHours,
      webSite,
      phoneNumber,
    } = await generalInformation();
    const reviews = await getReviews();
    const introduction = await getIntroduction();

    return {
      currentUrl,
      location,
      category,
      albumImages,
      totalRating,
      address,
      openingHours,
      webSite,
      phoneNumber,
      reviews,
      introduction,
    };
  }

  const result = await main();
  console.log(result);
  return result;
}
