const TTL_SECONDS = 5 * 60;
const LOCAL_STORAGE_KEYS = [
    'smalruby3-mesh-extension-policy',
    'smalruby3-mesh-extension-ttl'
];

const webRTCIPHandlingPolicy = chrome.privacy.network.webRTCIPHandlingPolicy;

const getTtlSeconds = () => {
    return Math.floor(Date.now() / 1000) + TTL_SECONDS;
};

const createSavedPolicy = (policy) => {
    return {
        'smalruby3-mesh-extension-policy': policy,
        'smalruby3-mesh-extension-ttl': getTtlSeconds()
    };
};

let changing = false;

const changeWebRTCIPHandlingPolicy = () => {
    console.log('Changing webRTCIPHandlingPolicy to default');

    if (changing) {
        console.warn('Not changed: reason=<Changing webRTCIPHandlingPolicy>');
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
            chrome.storage.local.set(createSavedPolicy(details.value), () => {
                if (chrome.runtime.lastError === undefined) {
                    webRTCIPHandlingPolicy.set({value: 'default'}, () => {
                        if (chrome.runtime.lastError === undefined) {
                            console.log('Succeeded to change webRTCIPHandlingPolicy to default');
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
        console.warn('Not reverted: reason=<changing webRTCIPHandlingPolicy>');
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
                        console.warn('Not reverted: reason=<not saved webRTCIPHandlingPolicy>');
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

chrome.runtime.onInstalled.addListener(() => {
    // TODO: スモウルビー3のサイトのみ処理する
    // TODO: スモウルビー3のサイトを設定で追加できる。192.168.*.*とか
    // TODO: WebRTCの設定を変更する
    // TODO: WebRTCの設定を元に戻す
    // TODO: WebRTCの設定を変更したときにバッジを表示する ON
    // TODO: WebRTCの設定を元に戻したときにバッジを消す
    // TODO: 拡張機能のボタンを押すと一時的にWebRTCの設定を変更する
    // TODO: メッシュ機能でWebRTCで接続するときだけWebRTCの設定を変更し、接続が完了したときや、切断したときにWebRTCの設定を元に戻す
    console.log("Smalruby3 Mesh Extension installed.");


	  chrome.browserAction.onClicked.addListener(() => {
        changeWebRTCIPHandlingPolicy();

        setTimeout(revertWebRTCIPHandlingPolicy, 60 * 1000);
    });
});
