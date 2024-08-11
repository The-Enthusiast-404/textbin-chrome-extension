// Listen for messages from the extension
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "checkAuth") {
    const token = localStorage.getItem("token");
    if (token) {
      chrome.runtime.sendMessage({ action: "setAuthToken", token: token });
    }
  }
});

// Listen for changes in local storage
window.addEventListener("storage", function (e) {
  if (e.key === "token") {
    if (e.newValue) {
      chrome.runtime.sendMessage({ action: "setAuthToken", token: e.newValue });
    } else {
      chrome.runtime.sendMessage({ action: "logout" });
    }
  }
});

// Function to inject a button into the TextBin website
function injectQuickPasteButton() {
  const button = document.createElement("button");
  button.textContent = "Quick Paste";
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "9999";
  button.addEventListener("click", function () {
    chrome.runtime.sendMessage({
      action: "createTab",
      url: chrome.runtime.getURL("popup.html"),
    });
  });
  document.body.appendChild(button);
}

// Call the function to inject the button
injectQuickPasteButton();
