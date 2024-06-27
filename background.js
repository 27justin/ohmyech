// Object to keep track of the ECH status indexed by tabId.
let tabECH = {};

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status == 'loading') {
		tabECH[tabId] = {
			fullECH: true, // All resources were loaded with ECH, if true a green lock is displayed.
			intermittentECH: false // Some resources were loaded with ECH, but not all if `fullECH` is set to false.
		};

		// Attach the webRequest listeners to this tab.
		browser.webRequest.onHeadersReceived.addListener((details) => {
			browser.webRequest.getSecurityInfo(details.requestId, {})
				.then((tls) => {
					if(tls.state === "insecure") browser.pageAction.hide(tabId); // Either-way, this is insecure. Might as well hide it.
					const usedEch = tls.usedEch;
					if(usedEch === true) {
						tabECH[tabId].intermittentECH = true;
					}

					tabECH[tabId].fullECH = tabECH[tabId].fullECH && usedEch;
					browser.pageAction.show(tabId);

					if(tabECH[tabId].fullECH) {
						browser.pageAction.setIcon({tabId, path: "icons/ech-active.png"});
						browser.pageAction.setTitle({tabId, title: "This site and all subsequent fetches from this page used ECH"});
					}else{
						if(tabECH[tabId].intermittentECH) {
							browser.pageAction.setIcon({tabId, path: "icons/ech-semiactive.png"});
							browser.pageAction.setTitle({tabId, title: "This site, or a subsequent fetch, did use ECH. But not all resources were loaded with ECH"});
						}else{
							browser.pageAction.setIcon({tabId, path: "icons/ech-inactive.png"});
							browser.pageAction.setTitle({tabId, title: "This site, or any subsequent fetch, did not use ECH"});
						}
					}
				}).catch(console.error);
		}, {tabId, urls: ["<all_urls>"]}, ['blocking']);
	}
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
	delete tabECH[tabId];
});

