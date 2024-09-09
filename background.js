import { DOM_TREE } from './domStructure.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractInfo") {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: extractInformation,
      args: [DOM_TREE],
    });

    return true;
  }
});

async function extractInformation(DOM_TREE) {

  const tabConstant = {
    general: 0,
    review: 1,
    introduce: 2,
  };

  function getElementByTreePath (tree, path, pathFromRoot = false) {
      let currentNode = tree;
      if(!path)
        return null;

      const pathArr = path.split('>');
      let selector = '';
      for (const node of pathArr) {
        if(currentNode.children){
          currentNode = currentNode.children[node.trim()];
        }else{
          currentNode = currentNode[node.trim()];
        }

        if (!currentNode) {
              console.error('Invalid path in the DOM tree:', path);
              return null;
          }
          
          if(pathFromRoot){
            selector += ` ${currentNode.selector}` ;
          }else{
            selector = currentNode.selector;
          }
      }
      
      return selector;
  };

  function querySelectorAll(selector){
    return document.querySelectorAll(selector);
  }

  function querySelector(selector){
    return document.querySelector(selector);
  }


  function DOMQuerySelector(tree, path){
      const selector = getElementByTreePath(tree, path);
      if(selector)
        return querySelector(selector);

      return null;
  }

  function DOMQuerySelectorAll(tree, path, pathFromRoot = false){
    const selector = getElementByTreePath(tree, path,pathFromRoot);
    if(selector)
      return querySelectorAll(selector);

    return null;
  }

  function checkElement(selector){
    const element = document.querySelector(selector);
    if(!element){
      console.warn(`Element ${selector} not found`)
      return false;
    }

    return true;
  }

  
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
    const tabLists = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > tab > list')?.childNodes;
    tabLists[index].click();
    await waitForElement(waitForSelector);
  }

  function extractCoordinates(url) {
    // Use a regular expression to match the part of the URL that contains the coordinates
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);

    if (match) {
      // Extract latitude, longitude from the match groups
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
    const address = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > generalTab > address').innerText;
    const { latitude, longitude } = extractCoordinates(currentUrl);

    const { street, ward, district, city, country } =
      extractAddressDetails(address);

    return { street, ward, district, city, country, latitude, longitude };
  }

  function hasAlbumImage(){
     return checkElement(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > generalTab > thumbnail > totalImage'));
  }

  async function generalInformation() {
    debugger;
    // wait for the tab to be activate
    const generalElement = getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > location > name');
    if (!document.querySelector(generalElement)) {
      await switchToTab(tabConstant.general, generalElement); // Wait for the location element
    }

    const category = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > location > category').innerText;
    const location = document.querySelector(generalElement)?.innerText;
    const totalRating = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > location > rating').innerText;

    const currentUrl = window.location.href;
    const address = extractAddress(currentUrl);

    // Select all rows in the table that contains the opening hours information

    const openingHoursRows = DOMQuerySelectorAll(DOM_TREE.locationContainer, 'mainSection > generalTab > openinghours');

    let openingHours = [];

    openingHoursRows.forEach((row) => {
      const day = row.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > generalTab > openinghours > day'))?.innerText || "";
      const hours = row.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > generalTab > openinghours > hours'))?.innerText || "";
      openingHours.push({ day, hours });
    });

    const webSite = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > generalTab > website')?.innerText;
    const phoneNumber = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > generalTab > phone')?.innerText;

    debugger;
    let albumImages = [];
    if(hasAlbumImage()){
       albumImages = await getAlbumImage();
      // back to previous tab after get all of image in album
      const topBarAlbum = DOMQuerySelector(DOM_TREE.locationContainer, 'albumSection > topBarAlbum');
      if(topBarAlbum){
        topBarAlbum.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'albumSection > topBarAlbum > escapeAlbum')).click();
        await waitForElementInvisible('div[class="google-symbols G47vBd"]');
      }
    }else{
      const thumbnailSelector = querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > generalTab > thumbnail > imageButton > link'));
      const imageUrl = thumbnailSelector.getAttribute('src');
      albumImages.push(imageUrl);
    }
   
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
    const thumbnailSelector = querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > generalTab > thumbnail > imageButton'));
    if(!thumbnailSelector)
      return [];

    thumbnailSelector.click();
    await waitForElement(getElementByTreePath(DOM_TREE.locationContainer, 'albumSection > topBarAlbum'));

    const albumSectionSelector = getElementByTreePath(DOM_TREE.locationContainer, 'albumSection');
    const album = await waitForElement(albumSectionSelector);
    const imageChildNodes = album.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'albumSection > image')).childNodes;

    let images = [];
    for (let i = 0; i < imageChildNodes.length; i++) {
      let image = imageChildNodes[i]?.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'albumSection > image > url'));
      const imageUrl = regexImageUrl(image);
      if (imageUrl) {
        images.push(imageUrl);
      }
    }

    return images;
  }

  function getTotalReview() {
    const totalReviewText = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > reviewTab > totalReview').innerText;
    const regex = /\d+/;
    const match = totalReviewText.match(regex);
    return match ? match[0] : 0;
  }

  async function sortByNewestComment() {
    // find sort by menu element to trigger click
    const sortByElement = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > reviewTab > sortBy');
    sortByElement.click();

    // wait for sort by option is visible
    const sortByMenu = getElementByTreePath(DOM_TREE, 'appContainer > sortByMenu');
    await waitForElement(sortByMenu);

    // select the newest option
    const sortByLatestOption = DOMQuerySelector(DOM_TREE.appContainer, 'sortByMenu > newest', true);
    sortByLatestOption.click();
  }

  function getLoadMoreElementByReviewId(dataReviewId){
    return `${getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > review')} button[data-review-id="${dataReviewId}"]`;
  }

  async function expandComment(commentElement) {
    const expanReviewElement = commentElement?.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > review > buttonLoadMore'));
    if (expanReviewElement) {
      expanReviewElement.click();
      const dataReviewId = expanReviewElement.getAttribute("data-review-id");
      await waitForElementInvisible(getLoadMoreElementByReviewId(dataReviewId));
    }
  }

  async function getReviews() {
    // wait for the tab to be activate
    const buttonReviewTab = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > tab > buttonReviewTab');
    if (!buttonReviewTab) return;

    const mainSectionSelector = getElementByTreePath(DOM_TREE, 'locationContainer > mainSection', true);
    const tabActive = getElementByTreePath(DOM_TREE, 'locationContainer > mainSection > tab > activeClass');
    if (!buttonReviewTab.classList.contains(tabActive)) {
      await switchToTab(tabConstant.review, mainSectionSelector);
    }

    // sort comment by newest comment
    await sortByNewestComment();

    // wait for review list are display
    const reviewTab = getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab', true);
    await waitForElement(reviewTab, true);

    let reviews = [];
    const mainSection = querySelector(mainSectionSelector);
    var reviewNodes = mainSection?.querySelector(reviewTab)
                                  .querySelectorAll(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode'));

    const limit = getTotalReview();

    for (let i = 0; i < limit; i++) {
      let reviewNode = reviewNodes[i];

      // in case element not available => try to load more element
      if (!reviewNode) {
        reviewNodes = await loadMoreReviewNodes(
          mainSection,
          reviewTab,
          limit
        );
        reviewNode = reviewNodes[i];
      }

      const dataReviewId = reviewNode.getAttribute('data-review-id');
      const user = reviewNode.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > user'))?.innerText;
      const rating = reviewNode.querySelectorAll(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > ratingAndCommentTime > rating'))?.length;
      
      // There are 2 type of comment structure
      // 1 - display inside of div has class .MyEned
      // 2 - display with child nodes in a div without any id or class
      let commentElement = reviewNode.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > review'));
      if (!commentElement) {
        commentElement = reviewNode.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > ratingAndCommentTime')).nextSibling;
      }

      // expan comment if too log
      await expandComment(commentElement);

      const comment = commentElement?.innerText || "";
      const commentTime = reviewNode.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > ratingAndCommentTime > commentTime'))?.innerText || "";

      const images = extractImages(reviewNode);

      reviews.push({dataReviewId, user, rating, comment, commentTime, images });
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
    reviewNodes = reviewList.querySelectorAll(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode'));

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
    const buttonIntroductionTab = DOMQuerySelector(DOM_TREE.locationContainer, 'mainSection > tab > buttonIntroductionTab');
    if (!buttonIntroductionTab) return "";

    const mainSectionSelector = getElementByTreePath(DOM_TREE, 'locationContainer > mainSection', true);
    const tabActive = getElementByTreePath(DOM_TREE, 'locationContainer > mainSection > tab > activeClass');
    if (!buttonIntroductionTab.classList.contains(tabActive)) {
      await switchToTab(tabConstant.introduce, mainSectionSelector);
    }

    const introductions = DOMQuerySelectorAll(DOM_TREE, 'locationContainer > mainSection > introduction', true);
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
    const imageElements = el.querySelector(getElementByTreePath(DOM_TREE.locationContainer, 'mainSection > reviewTab > reviewNode > image'))?.childNodes;
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

  async function extract(){
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

  async function lazyLoadResult(previousScrollHeight) {
    // load all search results
    const resultSection = DOMQuerySelector(DOM_TREE, 'searchResultContainer > resultSection', true);
  
    // Scroll to the bottom of the result area
    resultSection.scrollTop = resultSection.scrollHeight;
  
    // Wait for the scroll and lazy load to finish using requestAnimationFrame
    await new Promise((resolve) => {
      function checkScrollHeight() {
        if (resultSection.scrollHeight === previousScrollHeight) {
          resolve(previousScrollHeight);
        } else {
          previousScrollHeight = resultSection.scrollHeight;
          requestAnimationFrame(checkScrollHeight); // Check again in the next frame
        }
      }
      requestAnimationFrame(checkScrollHeight); // Initial call
    });
  
    // If scroll height hasn't changed, stop recursion; otherwise, keep loading more results
    if (previousScrollHeight !== resultSection.scrollHeight) {
      await lazyLoadResult(previousScrollHeight); // Recursively load more items
    }
  }

  async function main() {
    // search result
    debugger;
    const resultContainer = DOMQuerySelector(DOM_TREE, 'searchResultContainer');
    if(resultContainer){
        let searchResults = DOMQuerySelectorAll(DOM_TREE, 'searchResultContainer > resultSection > resultItem', true);
        if(searchResults.length > 0){
          // Get the initial scrollHeight of the result container
            const previousScrollHeight = 0;
            await lazyLoadResult(previousScrollHeight);

            // get all search result
            debugger;
            searchResults = DOMQuerySelectorAll(DOM_TREE, 'searchResultContainer > resultSection > resultItem', true);
            for (let index = 0; index < searchResults.length; index++) {
              const result = searchResults[index];
              result.querySelector(getElementByTreePath(DOM_TREE.searchResultContainer, 'resultSection > resultItem > link')).click();
              await waitForElement(getElementByTreePath(DOM_TREE, "locationContainer"));
              var extractResult = await extract();
              console.log(extractResult);
              
            }
        }
    }
  }

  await main();
}
