document.getElementById('allcommentsCheckbox').addEventListener('change', function() {
    const isChecked = this.checked;
    document.getElementById('numberOfComment').disabled = isChecked;
});

document.getElementById('extractButton').addEventListener('click', () => {
    const shouldExtractAllComments = document.getElementById('allcommentsCheckbox').checked;
    const numberOfComment = shouldExtractAllComments ? null : parseInt(document.getElementById('numberOfComment').value, 10);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.runtime.sendMessage({
            action: 'extractInfo',
            tabId: tabs[0].id,
            shouldExtractAllComments: shouldExtractAllComments,
            numberOfComment: numberOfComment
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