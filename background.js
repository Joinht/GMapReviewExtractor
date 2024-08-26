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
    // base information
    const currentUrl = window.location.href;
    const location = document.querySelector(".DUwDvf.lfPIob")?.innerText
    const thumbnail = document.querySelector(".RZ66Rb.FgCUCc img")?.src;
    const totalRating = document.querySelector(".F7nice span span")?.innerText ||  0;

    const addressElement = document.querySelector('[data-item-id="address"]');
    const address = addressElement?.querySelector('.Io6YTe')?.innerText || 'Address not found';

    // Select all rows in the table that contains the opening hours information
    const openingHoursRows = document.querySelectorAll('tr.y0skZc');

    let openingHours = [];

    openingHoursRows.forEach(row => {
        const day = row.querySelector('td.ylH6lf div')?.innerText || 'Unknown Day';
        const hours = row.querySelector('td.mxowUb li.G8aQO')?.innerText || 'Unknown Hours';
        openingHours.push({ day, hours });
    });

    // website
    const websiteElement = document.querySelector('.rogA2c.ITvuef .fontBodyMedium');
    const webSite = websiteElement?.innerText || '';


     // Get the inner text of the selected element
    const phoneNumberElement = document.querySelector('.AeaXub .rogA2c .fontBodyMedium');
    const phoneNumber = phoneNumberElement?.innerText || '';


    let reviews = [];
    const reviewElements = document.querySelectorAll('.jJc9Ad');
    const limit = shouldExtractAllComments ? reviewElements.length : Math.min(reviewElements.length, commentCount);

    for (let i = 0; i < limit; i++) {
        const el = reviewElements[i];
        const user = el.querySelector('.d4r55')?.innerText || 'Unknown User';
        const rating = el.querySelector('span[class*="kvMYJc"]')?.querySelectorAll('.elGi1d')?.length || 'No Rating';
        const comment = el.querySelector('.MyEned')?.innerText || 'No Comment';
        const commentTime  = el.querySelector('.rsqaWe')?.innerText || 'Unknown';

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
        
        reviews.push({ user, rating, comment, commentTime, images });
    }

    console.log({
        currentUrl, location, thumbnail, totalRating, address, openingHours, webSite, phoneNumber, reviews
    });
}