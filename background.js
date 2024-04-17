// Object to keep track of the ECH status indexed by tabId.
let tabECH = {};

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status == 'loading') {
		tabECH[tabId] = true;

		// Attach the webRequest listeners to this tab.
		browser.webRequest.onHeadersReceived.addListener((details) => {
				browser.webRequest.getSecurityInfo(details.requestId, {})
					.then((tls) => {
						if(tls.state === "insecure") browser.pageAction.hide(tabId); // Either-way, this is insecure. Might as well hide it.
						tabECH[tabId] = tabECH[tabId] && tls.usedEch;

						browser.pageAction.show(tabId);

						if(tabECH[tabId]) {
							browser.pageAction.setIcon({tabId, path: "icons/ech-active.png"});
							browser.pageAction.setTitle({tabId, title: "This site and all subsequent fetches from this page used ECH"});
						}else{
							browser.pageAction.setIcon({tabId, path: "icons/ech-inactive.png"});
							browser.pageAction.setTitle({tabId, title: "This site, or any subsequent fetch, did not use ECH"});
						}
					}).catch(console.error);
			}, {tabId, urls: ["<all_urls>"]}, ['blocking']);
	}
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
	delete tabECH[tabId];
});

