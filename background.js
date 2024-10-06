import { DOM_STRUCTURE } from './domStructure.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractInfo") {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: extractInformation,
      args: [DOM_STRUCTURE, request.syncComment],
    });

    return true;
  }

  if (request.action === "openNewTab") {
    chrome.tabs.create({ url: request.url }, (newTab) => {
      const newTabId = newTab.id;
      // Listen for the tab to finish loading
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTabId && changeInfo.status === 'complete') {
          // Run extractInformation once the tab is fully loaded
          chrome.scripting.executeScript({
            target: { tabId: newTabId },
            func: extractInformation,
            args: [DOM_STRUCTURE, request.syncComment],
          }, (results) => {
            if (chrome.runtime.lastError) {
              sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
            } else {
              // Send back the results from extractInformation
              const extractResult = results && results[0] ? results[0].result : null;
              sendResponse({ status: 'done', data: extractResult });
              // after extract information is done, we need to close window to save memory
              setTimeout(() => {
                chrome.tabs.remove(newTabId);
            }, 1000);  
            }
          });

          // Remove the listener to avoid future triggers for the same tab
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });

    return true;
  }
});

async function extractInformation(DOM_STRUCTURE, syncComment) {
  const tabConstant = {
    general: 0,
    review: 1,
    introduce: 2,
  };

  const base_url = "https://9525-116-96-30-59.ngrok-free.app";
  const endpoint ={
    location: {
      add: "/api/location/add"
    }
  }

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
            if(currentNode.selector){
              selector += ` ${currentNode.selector}` ;
            }
          }else{
            selector = currentNode.selector;
          }
      }
      
      return selector;
  };

  function delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function clickWithDelay(element, config = { beforeClickDelay: 0, afterClickDelay: 0 }){
    const { beforeClickDelay, afterClickDelay } = config;
    // Delay before clicking
    if (beforeClickDelay > 0) {
      await delay(beforeClickDelay);
    }

    element.click();

    if (afterClickDelay > 0) {
        await delay(afterClickDelay);
    }
  }

  function querySelectorAll(selector){
    return document.querySelectorAll(selector);
  }

  function querySelector(selector){
    const element = document.querySelector(selector);
    if(!element){
      console.warn(`Selector ${selector} not found`);
    }

    return element;
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
    return querySelector(selector);
  }

  async function lazyLoadData(selector, lastSelector, intervalMs = 500) {
    return new Promise((resolve) => {
      const scrollableElement = document.querySelector(selector);
      let previousHeight = 0;
  
      const interval = setInterval(() => {
        scrollableElement.scrollTop = scrollableElement.scrollHeight;
        const currentHeight = scrollableElement.scrollHeight;
  
        const isDone = lastSelector ? checkElement(lastSelector) : currentHeight === previousHeight;
        if (isDone) {
          clearInterval(interval);
          scrollableElement.scrollTo(0, 0);
          resolve();
        }else{
          previousHeight = currentHeight;
        }
  
      }, intervalMs);
    });
  }

  async function lazyLoadAlbumImages(selector, scrollHeight = 500, intervalMs = 500) {
    return new Promise((resolve) => {
      const scrollableElement = document.querySelector(selector);
      let previousHeight = 0;
  
      const interval = setInterval(() => {
        const scrollToHeight = scrollableElement.scrollTop + scrollHeight;
        scrollableElement.scrollTop = scrollToHeight;
        const currentHeight = scrollToHeight;
        if (currentHeight === previousHeight) {
          clearInterval(interval);
          scrollableElement.scrollTo(0, 0);
          resolve();
        }else{
          previousHeight = currentHeight;
        }
  
      }, intervalMs);
    });
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
          const element = querySelector(selector);

          // check the condition to determine that element already displayed
          if (element && (!hasChild || element.hasChildNodes())) {
            clearInterval(checkInterval);
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            console.warn(`Timeout: Element ${selector} not found within ${timeout}ms`);
            reject(
              `Timeout: Element ${selector} not found within ${timeout}ms`
            );
          }
        } else {
          console.warn(`selector is invalid`);
        }
      }, interval);
    });
  }

  function waitForElementInvisible(selector, timeout = 10000, interval = 500) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        const element = querySelector(selector);
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
    const tabLists = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > tab > list')?.childNodes;
    tabLists[index].click();
    await waitForElement(waitForSelector);
  }
  
  function regexUrl(url){
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    return match;
  }

  function extractCoordinates(url) {
    // Use a regular expression to match the part of the URL that contains the coordinates
    const match = regexUrl(url);
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
      return { street: "", ward: "", district: "", city: "", country: "Việt nam" };

    const parts = address.split(",")?.map((part) => part?.trim()).reverse();

    const city = parts[0] || null;
    const district = parts[1] || null;
    const ward = parts[2] || null;
    const street = parts[3] || null;

    return {
      street,
      ward,
      district,
      city,
      country: "Việt Nam",
    };
  }

  function extractAddress(currentUrl) {
    const address = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > address').innerText;
    const { latitude, longitude } = extractCoordinates(currentUrl);

    const { street, ward, district, city, country } =
      extractAddressDetails(address);

    return { street, ward, district, city, country, latitude, longitude };
  }

  function hasAlbumImage(){
     return checkElement(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > thumbnail > totalImage'));
  }

  function hasThumbail(){
    return checkElement(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > thumbnail > imageButton'));
 }
  
  async function waitForUrl(timeout = 10000,interval = 500){
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const ival = setInterval(() => {
          const url = window.location.href;
          // check the condition to determine that element already displayed
          if (regexUrl(url)) {
            clearInterval(ival);
            resolve();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(ival);
            reject();
          }
      }, interval);
    });
  }

  async function generalInformation() {
    // wait for the tab to be activate
    const generalElement = getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > location > name');
    if (!checkElement(generalElement)) {
      await switchToTab(tabConstant.general, generalElement); // Wait for the location element
    }

    const category = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > location > category').innerText;
    const location = querySelector(generalElement)?.innerText;
    const total_rating = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > location > rating') ?.innerText || 0;

    await waitForUrl();

    const current_url = window.location.href;
    const address = extractAddress(current_url);

    // Select all rows in the table that contains the opening hours information

    const openingHoursRows = DOMQuerySelectorAll(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > openinghours');

    let opening_hours = [];

    openingHoursRows.forEach((row) => {
      const day = row.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > openinghours > day'))?.innerText || "";
      const hours = row.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > openinghours > hours'))?.innerText || "";
      opening_hours.push({ day, hours });
    });

    const website = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > website')?.innerText;
    const phone_number = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > phone')?.innerText;

    let album_images = [];
    if(hasAlbumImage()){
       album_images = await getAlbumImage();
      // back to previous tab after get all of image in album
      const topBarAlbum = querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'albumSection > topBarAlbum'));
      if(topBarAlbum){
        const escapeSelector = getElementByTreePath(DOM_STRUCTURE.locationContainer, 'albumSection > topBarAlbum > escapeAlbum');
        topBarAlbum.querySelector(escapeSelector).click();
        await waitForElementInvisible('div[class="google-symbols G47vBd"]');
      }
    }else{
      if(hasThumbail()){
        const thumbnailSelector = querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > thumbnail > imageButton > link'));
        const imageUrl = thumbnailSelector.getAttribute('src');
        album_images.push(imageUrl);
      }
    }
   
    return {
      current_url,
      location,
      category, 
      album_images,
      total_rating,
      address,
      opening_hours,
      website,
      phone_number,
    };
  }

  async function getAlbumImage() {
    const thumbnailSelector = querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > generalTab > thumbnail > imageButton'));
    if(!thumbnailSelector)
      return [];

    await clickWithDelay(thumbnailSelector, {beforeClickDelay: 1000, afterClickDelay: 1000});
    await waitForElement(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'albumSection > topBarAlbum'));

    const albumSectionSelector = getElementByTreePath(DOM_STRUCTURE.locationContainer, 'albumSection');
    const album = await waitForElement(albumSectionSelector);
   
    await lazyLoadAlbumImages(albumSectionSelector);

    const imageChildNodes = album.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'albumSection > image')).childNodes;
    
    let images = [];
    for (let i = 0; i < imageChildNodes.length; i++) {
      let image = imageChildNodes[i]?.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'albumSection > image > url'));
      const imageUrl = regexImageUrl(image);
      if (imageUrl) {
        images.push(imageUrl);
      }
    }

    return images;
  }

  async function sortByNewestComment() {
    // find sort by menu element to trigger click
    const sortByElement = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > sortBy');
    if(!sortByElement)
      return;

    await clickWithDelay(sortByElement, {beforeClickDelay: 1000, afterClickDelay: 1000});
    // wait for sort by option is visible
    const sortByMenu = getElementByTreePath(DOM_STRUCTURE, 'appContainer > sortByMenu');
    await waitForElement(sortByMenu);

    // select the newest option
    const sortByLatestOption = DOMQuerySelector(DOM_STRUCTURE.appContainer, 'sortByMenu > newest', true);
    sortByLatestOption.click();
  }

  function getLoadMoreElementByReviewId(dataReviewId){
    return `${getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > review')} button[data-review-id="${dataReviewId}"]`;
  }

  async function expandComment(commentElement) {
    const expanReviewElement = commentElement?.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > review > buttonLoadMore'));
    if (expanReviewElement) {
      expanReviewElement.click();
      const dataReviewId = expanReviewElement.getAttribute("data-review-id");
      await waitForElementInvisible(getLoadMoreElementByReviewId(dataReviewId));
    }
  }

  async function getReviews() {
    // wait for the tab to be activate
    const buttonReviewTab = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > tab > buttonReviewTab');
    if (!buttonReviewTab) return;

    const mainSectionSelector = getElementByTreePath(DOM_STRUCTURE, 'locationContainer > mainSection', true);
    const tabActive = getElementByTreePath(DOM_STRUCTURE, 'locationContainer > mainSection > tab > activeClass');
    if (!buttonReviewTab.classList.contains(tabActive)) {
      await switchToTab(tabConstant.review, mainSectionSelector);
    }

    // sort comment by newest comment
    await sortByNewestComment();

    // wait for review list are display
    const reviewTab = getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab', true);
    await waitForElement(reviewTab, true);

    let reviews = [];
    const mainSection = querySelector(mainSectionSelector);

    await lazyLoadData(mainSectionSelector);

    var reviewNodes = mainSection?.querySelector(reviewTab)
                                  .querySelectorAll(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode'));

    for (let i = 0; i < reviewNodes.length; i++) {
      try {
        const reviewNode = reviewNodes[i];
        reviewNode.scrollIntoView();
        const data_review_id = reviewNode.getAttribute('data-review-id');
        const user = reviewNode.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > user'))?.innerText;
        const rating = reviewNode.querySelectorAll(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > ratingAndCommentTime > rating'))?.length;
        
        // There are 2 type of comment structure
        // 1 - display inside of div has class .MyEned
        // 2 - display with child nodes in a div without any id or class
        let commentElement = reviewNode.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > review'));
        if (!commentElement) {
          commentElement = reviewNode.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > ratingAndCommentTime')).nextSibling;
        }

        // expan comment if too log
        await expandComment(commentElement);

        const comment = commentElement?.innerText || "";
        const comment_time = reviewNode.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > ratingAndCommentTime > commentTime'))?.innerText || "";

        const images = extractImages(reviewNode);

        reviews.push({data_review_id, user, rating, comment, comment_time, images });
      } catch (error) {
          console.error(error);
      }
    }

    return reviews;
  }

  async function getIntroduction() {
    const buttonIntroductionTab = DOMQuerySelector(DOM_STRUCTURE.locationContainer, 'mainSection > tab > buttonIntroductionTab');
    if (!buttonIntroductionTab) return "";

    const mainSectionSelector = getElementByTreePath(DOM_STRUCTURE, 'locationContainer > mainSection', true);
    const tabActive = getElementByTreePath(DOM_STRUCTURE, 'locationContainer > mainSection > tab > activeClass');
    if (!buttonIntroductionTab.classList.contains(tabActive)) {
      await switchToTab(tabConstant.introduce, mainSectionSelector);
    }

    const introductions = DOMQuerySelectorAll(DOM_STRUCTURE, 'locationContainer > mainSection > introduction', true);
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
    const imageElements = el.querySelector(getElementByTreePath(DOM_STRUCTURE.locationContainer, 'mainSection > reviewTab > reviewNode > image'))?.childNodes;
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
      current_url,
      location,
      category,
      album_images,
      total_rating,
      address,
      opening_hours,
      website,
      phone_number,
    } = await generalInformation();
    const reviews = syncComment ? await getReviews() : [];
    const introduction = await getIntroduction();

    return {
      current_url,
      location,
      category,
      album_images,
      total_rating,
      address,
      opening_hours,
      website,
      phone_number,
      reviews,
      introduction
    };
  }


  function splitIntoBatches(list, batchSize) {
    let batches = [];
    for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize).map((item, index) => ({
            originalIndex: i + index,
            value: item
        }));
        batches.push(batch);
    }
    return batches;
}

  async function main() {
    // search result
    const resultContainer = DOMQuerySelector(DOM_STRUCTURE, 'searchResultContainer');
    if(resultContainer){
       // lazy load search result
        const searchResultSelector = getElementByTreePath(DOM_STRUCTURE,'searchResultContainer > resultSection', true);
        const endOfListMessageSelect = getElementByTreePath(DOM_STRUCTURE, 'searchResultContainer > resultSection > endOfListMessage', true);
        await lazyLoadData(searchResultSelector, endOfListMessageSelect);
         // load all search result
        const locations = Array.from(DOMQuerySelectorAll(DOM_STRUCTURE, 'searchResultContainer > resultSection > resultItem', true));
        console.log('total location: ',locations.length);
        // Process search results in batches
        const batchSize = 1;
        const result = splitIntoBatches(locations, batchSize);
        for (let index = 0; index < result.length; index++) {
          await processBatch(result[index]);
        }
    }else{
      var extractResult = await extract();
      debugger;
      console.log(extractResult);
      postLocation(extractResult);
      return extractResult;
    }
  }

  function postLocation(data = {}) {
    try {
      fetch(`${base_url}${endpoint.location.add}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })
      .then(response => {
        debugger;
        if (!response.ok) {
            console.error('Server error:', response.status, response.statusText);
            return response.text(); // Return text if the body is not JSON
        }
        return response.json();
      })
      .then(data => {
        debugger;
        resolve({ success: true, dataResponse });
      })
      .catch(error => {
        debugger;
        resolve({ success: false, error });
      });
    } catch (error) {
      // Handle any errors that occur during the fetch
      console.error('Fetch error:', error);
    }
  }


  var locations = [];
  var logs = [];
  async function processBatch(batch) {
    // Map the batch to an array of promises
    const promises = batch.map((resultItem) => {
      const node = DOMQuerySelectorAll(DOM_STRUCTURE, 'searchResultContainer > resultSection > resultItem > link', true)[resultItem.originalIndex];
      if (node) {
        const url = node.getAttribute('href');
        // Return the promise from openTabAndExtract
        return openNewTabAndExtractLocation(url);
      }
      // If the node is not found, return a resolved promise or handle it differently
      return Promise.resolve(null);
    });
  
    // Wait for all tabs in this batch to finish
    const results = await Promise.all(promises);
    locations.push(...results);
    console.log('location:', locations);
  }
  
 function openNewTabAndExtractLocation(url) {
    return new Promise((resolve, reject) => {
      // Open new tab
      chrome.runtime.sendMessage({ action: 'openNewTab', url: url, syncComment: syncComment }, (response) => {
        if (response.status === 'done') {
          debugger;
          var dataResponse = response.data;
          console.log(JSON.stringify(dataResponse));
          fetch(`${base_url}${endpoint.location.add}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(dataResponse)
          })
          .then(response => {
            debugger;
            if (!response.ok) {
                console.error('Server error:', response.status, response.statusText);
                return response.text(); // Return text if the body is not JSON
            }
            return response.json();
          })
          .then(data => {
            resolve({ success: true, dataResponse });
          })
          .catch(error => {
            resolve({ success: false, error });
          });
        } else {
          reject(new Error('Extraction failed'));
        }
      });
    });
  }

  function logMessage(message){
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}`;
    logs.push(logEntry);
  }

  // Function to save logs as a file
  function saveLogsAsFile() {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const link = document.createElement('a');
    
    // Set the download attribute with a default file name
    link.download = `job-log-${new Date().toISOString()}.txt`;
    link.href = URL.createObjectURL(blob);
    
    // Programmatically click the link to trigger download
    link.click();
  }

 return await main();

}
