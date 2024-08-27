document.getElementById('allcommentsCheckbox').addEventListener('change', function() {
    const isChecked = this.checked;
    document.getElementById('commentCount').disabled = isChecked;
});

document.getElementById('extractButton').addEventListener('click', () => {
    const shouldExtractAllComments = document.getElementById('allcommentsCheckbox').checked;
    const commentCount = shouldExtractAllComments ? null : parseInt(document.getElementById('commentCount').value, 10);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.runtime.sendMessage({
            action: 'extractInfo',
            tabId: tabs[0].id,
            shouldExtractAllComments: shouldExtractAllComments,
            commentCount: commentCount
        }, (response) => {
            debugger;
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError.message);
            } else if (response.error) {
                console.error('Response Error:', response.error);
            } else {
                console.log('Received Information in popup.js:', response);

            }
        });
    });
});