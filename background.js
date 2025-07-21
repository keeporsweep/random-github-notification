chrome.action.onClicked.addListener(async (tab) => {
  try {
    const tabs = await chrome.tabs.query({ url: "https://github.com/notifications*" });
    
    if (tabs.length > 0) {
      const notificationTab = tabs[0];
      await chrome.tabs.update(notificationTab.id, { active: true });
      await chrome.scripting.executeScript({
        target: { tabId: notificationTab.id },
        func: startNotificationRandomizer
      });
    } else {
      const newTab = await chrome.tabs.create({ url: "https://github.com/notifications" });
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: startNotificationRandomizer
          });
        }
      });
    }
  } catch (error) {
    console.error('Error in extension:', error);
  }
});

function startNotificationRandomizer() {
  function waitForSelector(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) return reject("Timeout: " + selector);
        requestAnimationFrame(check);
      })();
    });
  }

  function getRandomElement(arr) {
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  }

  function waitForIssueLinks(timeout = 8000, interval = 300) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const issueLinks = Array.from(document.querySelectorAll('a.notification-list-item-link'));
        if (issueLinks.length > 0) return resolve(issueLinks);
        if (Date.now() - start > timeout) return reject("Timeout waiting for issue/PR links");
        setTimeout(check, interval);
      })();
    });
  }

  async function clickRandomRepoAndIssue() {
    try {
      console.log("Waiting for repository nav...");
      await waitForSelector('nav[aria-label="Repositories"]');

      const repoLinks = Array.from(document.querySelectorAll('nav[aria-label="Repositories"] a.ActionListContent'));
      console.log("Found repo links:", repoLinks.map(a => a.href));

      const visibleRepos = repoLinks.filter(link => link.offsetParent !== null);
      const randomRepo = getRandomElement(visibleRepos);

      if (!randomRepo) throw new Error("No visible repo links found in nav[aria-label='Repositories']");

      console.log("Clicking repo link:", randomRepo.href);
      randomRepo.click();

      console.log("Waiting for issues/PRs to load...");
      const issues = await waitForIssueLinks();
      console.log("Issues/PRs found:", issues.length);

      const randomIssue = getRandomElement(issues);
      console.log("Clicking issue/PR:", randomIssue.href);
      randomIssue.click();

    } catch (err) {
      console.error("Error during notification randomization:", err);
    }
  }

  clickRandomRepoAndIssue();
}
