chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'extractInfo') {
        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            func: extractInformation,
            args: [request.shouldExtractAllComments, request.commentCount]
        });

        return true;
    }
});

function extractInformation(shouldExtractAllComments, commentCount) {

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
        const reviewArea = document.querySelector(reviewAreaElement)?.querySelector(reviewListElement);
        var reviewNodes = reviewArea.querySelectorAll('.fontBodyMedium');
        const limit = shouldExtractAllComments ? reviewNodes.length : Math.min(reviewNodes.length, commentCount);

        for (let i = 0; i < limit; i++) {
            const el = reviewNodes[i];
            const user = el.querySelector('.d4r55')?.innerText || 'Unknown User';
            const rating = el.querySelector('span[class*="kvMYJc"]')?.querySelectorAll('.elGi1d')?.length || '0';
            const comment = el.querySelector('.MyEned')?.innerText || '';
            const commentTime  = el.querySelector('.rsqaWe')?.innerText || '';

            const images = extractImages(el);

            reviews.push({ user, rating, comment, commentTime, images });
        }

        return reviews;
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

        console.log({ currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber, reviews, introduction });
    }

    main();
}