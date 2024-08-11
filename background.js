const API_BASE_URL = "https://textbin.theenthusiast.dev/v1";

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({ authToken: null, darkTheme: false });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "apiRequest") {
    handleApiRequest(request.method, request.endpoint, request.data)
      .then((response) => sendResponse({ success: true, data: response }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.action === "setAuthToken") {
    chrome.storage.local.set({ authToken: request.token }, function () {
      console.log("Auth token saved");
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  } else if (request.action === "getAuthToken") {
    chrome.storage.local.get(["authToken"], function (result) {
      sendResponse({ token: result.authToken });
    });
    return true; // Will respond asynchronously
  } else if (request.action === "removeAuthToken") {
    chrome.storage.local.remove("authToken", function () {
      console.log("Auth token removed");
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  }
});

async function handleApiRequest(method, endpoint, data) {
  const token = await new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], function (result) {
      resolve(result.authToken);
    });
  });

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: method,
    headers: headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
