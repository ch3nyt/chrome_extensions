// 建立右鍵選單（安裝/更新時執行一次）
chrome.runtime.onInstalled.addListener(() => {
  // 只在一般網頁內容顯示
  chrome.contextMenus.create({
    id: "scroll-bottom",
    title: "Scroll to the bottom",
    contexts: ["page"],                 // 只在頁面空白處右鍵才顯示
    documentUrlPatterns: ["*://*/*"]    // 視需要縮限網域
  });
  chrome.contextMenus.create({
    id: "scroll-top",
    title: "Scroll to the top",
    contexts: ["page"],
    documentUrlPatterns: ["*://*/*"]
  });
});

// 點擊右鍵選單後的處理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id === undefined) return;
  if (info.menuItemId === "scroll-bottom") {
    return doScroll(tab.id, "bottom");
  }
  if (info.menuItemId === "scroll-top") {
    return doScroll(tab.id, "top");
  }
});

async function doScroll(tabId, where = "bottom") {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },   // 若頁面用 iframe 承載，能同時嘗試子框架
    world: "MAIN",
    func: (direction) => {
      // 1) 尋找頁面上「最大」的可滾動容器
      function findScrollable() {
        const candidates = [];

        // 遞迴函數，用於搜尋所有節點（包含 Shadow DOM）
        function searchNodes(node) {
          if (!node || !(node instanceof Element) || seen.has(node)) {
            return;
          }
          seen.add(node);

          // 檢查節點本身是否可滾動
          try {
            const style = getComputedStyle(node);
            const canScroll =
              (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowY === "overlay") &&
              node.scrollHeight > node.clientHeight + 1; // +1 像素緩衝

            if (canScroll) {
              const rect = node.getBoundingClientRect();
              const area = rect.width * rect.height;

              // 啟發式規則：必須可見且有足夠大的面積 (例如 > 10000 像素)
              if (area > 10000 && style.visibility !== 'hidden' && style.display !== 'none') {
                candidates.push({ element: node, area: area });
              }
            }
          } catch (e) {
            // getComputedStyle 可能在某些特殊元素上失敗
          }

          // 搜尋 Shadow DOM
          if (node.shadowRoot) {
            Array.from(node.shadowRoot.children).forEach(searchNodes);
          }

          // 搜尋子節點
          Array.from(node.children).forEach(searchNodes);
        }

        const seen = new Set();
        // 從 document.body 開始搜尋
        searchNodes(document.body);

        // 排序：面積最大的優先
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.area - a.area);
          return candidates[0].element;
        }

        // 最終退回：文件級滾動
        return document.scrollingElement || document.documentElement || document.body;
      }

      const targetEl = findScrollable();
      const top = direction === "top" ? 0 : targetEl.scrollHeight;

      // 2) 優先用元素級平滑滾動 (你的原始碼，這部分很棒)
      try {
        if (typeof targetEl.scrollTo === "function") {
          targetEl.scrollTo({ top, behavior: "smooth" });
        } else {
          targetEl.scrollTop = top;
        }
      } catch {
        targetEl.scrollTop = top;
      }
      
      // 3) 你的最後手段 (window.scrollTo) 依然保留，作為備用
      //    (雖然在 SPA 中，如果 targetEl 正確，這一步通常不是必要的，但無害)
      try {
        const root = document.scrollingElement || document.documentElement;
        if (direction === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (root && root.scrollHeight > root.clientHeight) {
          window.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
        }
      } catch {}
    },
    args: [where]
  });
}

