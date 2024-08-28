chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractInfo') {
        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            func: extractInformation,
            args: [request.shouldExtractAllComments, request.numberOfComment]
        });

        // Return true to indicate you want to send a response asynchronously
        return true;
    }
});

async function extractInformation(shouldExtractAllComments, numberOfComment) {

    const tabConstant = {
        general: 0,
        review:1,
        introduce: 2
    }

    // Utility function to wait for an element to appear
    function waitForElement(selector, hasChild = false, timeout = 10000, interval = 100) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
    
            const checkInterval = setInterval(() => {
                const element = document.querySelector(selector);
                
                // check the condition to determine that element already displayed
                if (element && (!hasChild || element.hasChildNodes())) {
                    clearInterval(checkInterval);
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(`Timeout: Element ${selector} not found within ${timeout}ms`);
                }
            }, interval);
        });
    }

    async function switchToTab(index, waitForSelector) {
        const tabLists = document.querySelector('div.RWPxGd[role="tablist"]')?.childNodes;
        tabLists[index].click();
        await waitForElement(waitForSelector);
    }
   
    async function generalInformation(){
           // wait for the tab to be activate
           const generalElement = '.DUwDvf.lfPIob'
            if(!document.querySelector(generalElement)){
                await switchToTab(tabConstant.general, generalElement); // Wait for the location element
            }
            
            const currentUrl = window.location.href;
            const location = document.querySelector(generalElement)?.innerText
            const thumbnail = document.querySelector(".RZ66Rb.FgCUCc img")?.src;
            const totalRating = document.querySelector(".F7nice span span")?.innerText ||  0;

            const address = document.querySelector('[data-item-id="address"]')?.querySelector('.Io6YTe')?.innerText || '';

            // Select all rows in the table that contains the opening hours information
            const openingHoursRows = document.querySelectorAll('tr.y0skZc');

            let openingHours = [];

            openingHoursRows.forEach(row => {
                const day = row.querySelector('td.ylH6lf div')?.innerText || '';
                const hours = row.querySelector('td.mxowUb li.G8aQO')?.innerText || '';
                openingHours.push({ day, hours });
            });

            const webSite = document.querySelector('.rogA2c.ITvuef .fontBodyMedium')?.innerText || '';
            const phoneNumber = document.querySelector('[data-item-id^="phone:tel:"]')?.querySelector('.Io6YTe.fontBodyMedium')?.innerText || '';

            return {currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber};
    }

    function getTotalReview(){
        let totalReview = 0;
        const totalReviewText = document.querySelector('.PPCwl .fontBodySmall')?.innerText; 
        const regex = /\d+/;
        const match = totalReviewText.match(regex);

        if (match) {
            totalReview = match[0];
        }

        return totalReview;
    }

    async function getReviews(){

        // wait for the tab to be activate
        const reviewTab = document.querySelector('button[data-tab-index="1"]');
        if(!reviewTab) return;

        const reviewAreaElement = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde'
        if (!reviewTab.classList.contains('G7m0Af')) {
            await switchToTab(tabConstant.review, reviewAreaElement);
        }

        // wait for review list are display
        const reviewListElement = 'div[class="m6QErb XiKgde "]';
        await waitForElement(reviewListElement, true);

        let reviews = [];
        const reviewArea = document.querySelector(reviewAreaElement);
        const reviewList = reviewArea?.querySelector(reviewListElement);
        var reviewNodes = reviewList.querySelectorAll('.fontBodyMedium');

        const totalReview = getTotalReview();
        const limit = shouldExtractAllComments ? totalReview : Math.min(reviewNodes.length, numberOfComment);
        
        for (let i = 0; i < limit; i++) {
            let reviewNode = reviewNodes[i];

            // in case element not available => try to load more element
            if(!reviewNode){
                reviewNodes = await loadMoreReviewNodes(reviewArea, reviewListElement, limit);
                reviewNode = reviewNodes[i];
            }

            const user = reviewNode.querySelector('.d4r55')?.innerText || 'Unknown User';
            const rating = reviewNode.querySelector('span[class*="kvMYJc"]')?.querySelectorAll('.elGi1d')?.length || '0';
            const comment = reviewNode.querySelector('.MyEned')?.innerText || '';
            const commentTime  = reviewNode.querySelector('.rsqaWe')?.innerText || '';

            const images = extractImages(reviewNode);

            reviews.push({ user, rating, comment, commentTime, images });
        }

        return reviews;
    } 

    async function loadMoreReviewNodes(reviewArea, reviewListElement, numberOfComment) {
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
        reviewNodes = reviewList.querySelectorAll('.fontBodyMedium');
    
        // If not enough review nodes are loaded, call the function recursively
        if (reviewNodes.length < numberOfComment) {
            return loadMoreReviewNodes(reviewArea, reviewListElement, numberOfComment);
        }
    
        return reviewNodes;
    }

    async function getIntroduction(){

        const introductionTab = document.querySelector('button[data-tab-index="2"]');
        if(!introductionTab) return '';
        
        const introductionArea = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde'
        if (!introductionTab.classList.contains('G7m0Af')) {
            await switchToTab(tabConstant.introduce, introductionArea);
        }

        const introductions = document.querySelector(introductionArea)?.querySelectorAll('.fontBodyMedium');

        if(introductions.length > 0){
           return Array.from(introductions)
            .map(node => node.innerHTML?.replace(/\s*class="[^"]*"/g, '')) 
            .join('');
        }

        return '';
    }

    function extractImages(el){
        // extract images
        const imageElements = el.querySelector('.KtCyie')?.childNodes;
        const images =[];
        if(imageElements && imageElements.length > 0){
            for (let i = 0; i < imageElements.length; i++) {
                const el = imageElements[i];
                const style = el.getAttribute('style');
                const urlMatch = style.match(/url\("([^"]+)"\)/);
                if (urlMatch && urlMatch[1]) {
                    images.push(urlMatch[1]);
                }
            }
        }
    }

    async function main() {

        const { currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber } = await generalInformation();
        const reviews = await getReviews();
        const introduction = await getIntroduction();

        return { currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber, reviews, introduction };
    }

    const result = await main();
    console.log(result);
    return result;
}