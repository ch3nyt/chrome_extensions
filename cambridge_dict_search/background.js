chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "searchCambridge",
    title: "我要這個字在劍橋字典上的所有訊息(⁠╯⁠°⁠□⁠°⁠）⁠╯⁠︵⁠┻⁠━⁠┻",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchCambridge") {
    const query = info.selectionText;
    const url = `https://dictionary.cambridge.org/dictionary/english-chinese-traditional/${encodeURIComponent(query)}`;
    chrome.tabs.create({ url });
  }
});
