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
   
    async function basicInfomation(){
           // wait for the tab to be activate
            if(!document.querySelector('.DUwDvf.lfPIob')){
                await switchToTab(0, '.DUwDvf.lfPIob'); // Wait for the location element
            }
            
            const currentUrl = window.location.href;
            const location = document.querySelector(".DUwDvf.lfPIob")?.innerText
            const thumbnail = document.querySelector(".RZ66Rb.FgCUCc img")?.src;
            const totalRating = document.querySelector(".F7nice span span")?.innerText ||  0;

            const address = document.querySelector('[data-item-id="address"]')?.querySelector('.Io6YTe')?.innerText || '';

            // Select all rows in the table that contains the opening hours information
            const openingHoursRows = document.querySelectorAll('tr.y0skZc');

            let openingHours = [];

            openingHoursRows.forEach(row => {
                const day = row.querySelector('td.ylH6lf div')?.innerText || 'Unknown Day';
                const hours = row.querySelector('td.mxowUb li.G8aQO')?.innerText || 'Unknown Hours';
                openingHours.push({ day, hours });
            });

            const webSite = document.querySelector('.rogA2c.ITvuef .fontBodyMedium')?.innerText || '';
            const phoneNumber = document.querySelector('[data-item-id^="phone:tel:"]')?.querySelector('.Io6YTe.fontBodyMedium')?.innerText || '';

            return {currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber};
    }

    async function getComments(){
        
        // wait for the tab to be activate
        if(!document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde')){
            await switchToTab(1, '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde'); // Wait for the reviews container
        }

        // wait for review list are display
        await waitForElement('div[class="m6QErb XiKgde "]', true);

        let reviews = [];
        const reviewArea = document.querySelector(".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde")?.querySelector('div[class="m6QErb XiKgde "]');
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
        if(!document.querySelector('.hh2c6.G7m0Af')){
            return;
        }

         // wait for the tab to be activate
         const introductionClass ='.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde';
         const introductionArea =document.querySelector(introductionClass);
         if(!introductionArea){
            await switchToTab(2, introductionClass); // Wait for the reviews container
        }

        const contents = introductionArea.querySelectorAll('.fontBodyMedium');
        if(contents.length == 0){
             return [];
        }

        
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
        const { currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber } = await basicInfomation();
        const reviews = await getComments();
        const introduction = await getIntroduction();

        console.log({ currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber, reviews });
    }

    main();
}