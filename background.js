const TTL_SECONDS = 5 * 60;
const CHECK_TTL_INTERVAL_SECONDS = 1 * 60;

const LOCAL_STORAGE_KEYS = [
    'smalruby3-mesh-extension-policy',
    'smalruby3-mesh-extension-ttl'
];

const webRTCIPHandlingPolicy = chrome.privacy.network.webRTCIPHandlingPolicy;

const calcSeconds = (miliseconds) => {
    return Math.floor(miliseconds / 1000);
};

const getTTLSeconds = () => {
    return calcSeconds(Date.now()) + TTL_SECONDS;
};

const createSavedPolicy = (policy) => {
    return {
        'smalruby3-mesh-extension-policy': policy,
        'smalruby3-mesh-extension-ttl': getTTLSeconds()
    };
};

let changing = false;

const changeWebRTCIPHandlingPolicy = () => {
    console.log('Changing webRTCIPHandlingPolicy to default');

    if (changing) {
        console.log('Not changed: reason=<Changing webRTCIPHandlingPolicy>');
        return;
    }

    changing = true;

    webRTCIPHandlingPolicy.get({}, (details) => {
        console.log(`Current webRTCIPHandlingPolicy: ${JSON.stringify(details, null, 2)}`);

        if (details.value === 'default') {
            console.log('Not changed: reason=<Already set webRTCIPHandlingPolicy to default>');
	          chrome.browserAction.setBadgeText({text: 'ON'});

            changing = false;
        } else {
            const savedPolicy = createSavedPolicy(details.value);
            chrome.storage.local.set(savedPolicy, () => {
                if (chrome.runtime.lastError === undefined) {
                    webRTCIPHandlingPolicy.set({value: 'default'}, () => {
                        if (chrome.runtime.lastError === undefined) {
                            console.log(`Succeeded to change webRTCIPHandlingPolicy to default: ttl=<${savedPolicy['smalruby3-mesh-extension-ttl']}>`);
	                          chrome.browserAction.setBadgeText({text: 'ON'});

                            changing = false;
                        } else {
                            console.error(`Not changed: reason=<Failed setting webRTCIPHandlingPolicy to default> lastError=<${chrome.runtime.lastError}>`);

                            chrome.storage.local.remove(LOCAL_STORAGE_KEYS, () => {
                                if (chrome.runtime.lastError === undefined) {
                                    console.log('Removed saved webRTCIPHandlingPolicy from local storage');
                                } else {
                                    console.error(`Failed to remove webRTCIPHandlingPolicy from local storage: lastError=<${chrome.runtime.lastError}>`);
                                }

                                changing = false;
                            });
                        }
                    });
                } else {
                    console.error(`Not changed: reason=<Failed to save current webRTCIPHandlingPolicy> lastError=<${chrome.runtime.lastError}>`);

                    changing = false;
                }
            });
        }
    });
};

const revertWebRTCIPHandlingPolicy = () => {
    console.log('Revert webRTCIPHandlingPolicy to saved value');

    if (changing) {
        console.log('Not reverted: reason=<changing webRTCIPHandlingPolicy>');
        return;
    }

    changing = true;

    webRTCIPHandlingPolicy.get({}, (details) => {
        console.log(`Current webRTCIPHandlingPolicy: ${JSON.stringify(details, null, 2)}`);

        if (details.value === 'default') {
            chrome.storage.local.get(LOCAL_STORAGE_KEYS, (value) => {
                if (chrome.runtime.lastError === undefined) {
                    console.log(`Saved webRTCIPHandlingPolicy: ${JSON.stringify(value, null, 2)}`);

                    const policy = value['smalruby3-mesh-extension-policy'];
                    if (policy) {
                        webRTCIPHandlingPolicy.set({value: policy}, () => {
                            if (chrome.runtime.lastError === undefined) {
                                console.log(`Succeeded to revert webRTCIPHandlingPolicy to ${policy}`);
	                              chrome.browserAction.setBadgeText({text: ''});

                                chrome.storage.local.remove(LOCAL_STORAGE_KEYS, () => {
                                    if (chrome.runtime.lastError === undefined) {
                                        console.log('Removed saved webRTCIPHandlingPolicy from local storage');
                                    } else {
                                        console.error(`Failed to remove saved webRTCIPHandlingPolicy: lastError=<${chrome.runtime.lastError}>`);
                                    }

                                    changing = false;
                                });
                            } else {
                                console.log(`Not reverted: reason=<Failed to set webRTCIPHandlingPolicy> lastError=<${chrome.runtime.lastError}>`);

                                changing = false;
                            }
                        });
                    } else {
                        console.log('Not reverted: reason=<not saved webRTCIPHandlingPolicy>');
	                      chrome.browserAction.setBadgeText({text: ''});

                        changing = false;
                    }
                } else {
                    console.error('Not reverted: reason=<Failed to get saved webRTCIPHandlingPolicy>');

                    changing = false;
                }
            });
        } else {
            console.log('Not reverted: reason=<Already reverted webRTCIPHandlingPolicy>');
	          chrome.browserAction.setBadgeText({text: ''});

            changing = false;
        }
    });
};

const checkTTL = () => {
    const now = new Date();
    const nowSeconds = calcSeconds(now);

    console.log(`Checking TTL: now=<${now} (${nowSeconds})>`);

    chrome.storage.local.get(LOCAL_STORAGE_KEYS, (value) => {
        if (chrome.runtime.lastError === undefined) {
            console.log(`Saved webRTCIPHandlingPolicy: ${JSON.stringify(value, null, 2)}`);

            const ttl = value['smalruby3-mesh-extension-ttl'];
            if (ttl) {
                if (nowSeconds > ttl) {
                    console.log(`Reached TTL: now=<${nowSeconds}> ttl=<${ttl}>`);

                    revertWebRTCIPHandlingPolicy();
                } else {
                    console.log(`Not reached TTL: now=<${Number(now)}> ttl=<${ttl}> diff=<${ttl - nowSeconds}>`);
                }
            } else {
                console.log('Not saved webRTCIPHandlingPolicy');
            }
        } else {
            console.error(`Failed to get saved webRTCIPHandlingPolicy: lastError=<${chrome.runtime.lastError}>`);
        }
    });
};

chrome.runtime.onInstalled.addListener(() => {
    console.log('Smalruby3 Mesh Extension installed.');

    chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
        console.log(`Received message from web page: ${JSON.stringify(request, null, 2)}`);

        switch (request.action) {
        case 'change':
            changeWebRTCIPHandlingPolicy();
            break;
        case 'revert':
            revertWebRTCIPHandlingPolicy();
            break;
        }

        sendResponse({response: 'OK'});
    });

	  chrome.browserAction.onClicked.addListener((tab) => {
        if (tab.url.match(/^https?:\/\/[^\/]*\.?smalruby.(jp|app)(:[0-9]+)?\//)) {
            changeWebRTCIPHandlingPolicy();
        }
    });

    checkTTL();
    setInterval(checkTTL, CHECK_TTL_INTERVAL_SECONDS * 1000);
});

chrome.runtime.onSuspend.addListener(() => {
    revertWebRTCIPHandlingPolicy();
});
