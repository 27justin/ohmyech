// Object to keep track of the ECH status indexed by tabId.
let tabECH = {};

function updatePageAction(tabId) {
	const tab = tabECH[tabId];
	let icon, title;

	if (tab.fullECH) {
		icon = "icons/ech-active.png";
		title = "This site and all subsequent fetches from this page used ECH";
	} else if (tab.initialECH) {
		icon = "icons/ech-initial.png";
		title = "This page initially used ECH, but subsequent requests did not.";
	} else if (tab.partialECH) {
		icon = "icons/ech-semiactive.png";
		title = "A subsequent request did use ECH, but not all resources and not the initial page load used ECH";
	} else {
		icon = "icons/ech-inactive.png";
		title = "This site, or any subsequent fetch, did not use ECH";
	}

	browser.pageAction.setIcon({tabId, path: icon});
	browser.pageAction.setTitle({tabId, title});
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status == 'loading') {
		tabECH[tabId] = {
			fullECH: true, // All resources were loaded with ECH
			partialECH: false, // Some resources were loaded with ECH, but not all, including the initial page load.
			initialECH: true, // The initial page load was done via ECH, but subsequent resources were not.
			requests: 0
		};

		// Attach the webRequest listeners to this tab.
		browser.webRequest.onHeadersReceived.addListener((details) => {
			browser.webRequest.getSecurityInfo(details.requestId, {})
				.then((tls) => {
					tabECH[tabId].requests++;

					const usedECH = tls.usedEch;
					tabECH[tabId].fullECH = tabECH[tabId].fullECH && usedECH;
					tabECH[tabId].partialECH = tabECH[tabId].partialECH || usedECH;
					if(!usedECH && tabECH[tabId].requests === 1) {
						tabECH[tabId].initialECH = false;
					}

					browser.pageAction.show(tabId);
					updatePageAction(tabId)
				}).catch(console.error);
		}, {tabId, urls: ["<all_urls>"]}, ['blocking']);
	}
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
	delete tabECH[tabId];
});

