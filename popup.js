const API_BASE_URL = "https://textbin.theenthusiast.dev/v1";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const signInForm = document.getElementById("signInForm");
  const mainContent = document.getElementById("mainContent");
  const newPasteBtn = document.getElementById("newPasteBtn");
  const viewProfileBtn = document.getElementById("viewProfileBtn");
  const toggleThemeBtn = document.getElementById("toggleThemeBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const pasteForm = document.getElementById("pasteForm");
  const userInfo = document.getElementById("userInfo");

  loginForm.addEventListener("submit", handleSignIn);
  newPasteBtn.addEventListener("click", showNewPasteForm);
  viewProfileBtn.addEventListener("click", viewProfile);
  toggleThemeBtn.addEventListener("click", toggleTheme);
  signOutBtn.addEventListener("click", handleSignOut);
  pasteForm.addEventListener("submit", handleNewPaste);

  checkAuthStatus();
  loadThemePreference();
});

async function checkAuthStatus() {
  const token = await getAuthToken();
  if (token) {
    showMainContent();
    loadUserInfo();
    loadRecentPastes();
  } else {
    showSignInForm();
  }
}

function showSignInForm() {
  document.getElementById("signInForm").style.display = "block";
  document.getElementById("mainContent").style.display = "none";
}

function showMainContent() {
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("newPasteForm").style.display = "none";
  document.getElementById("recentPastes").style.display = "block";
}

function showNewPasteForm() {
  document.getElementById("newPasteForm").style.display = "block";
  document.getElementById("recentPastes").style.display = "none";
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await sendMessage({
      action: "apiRequest",
      method: "POST",
      endpoint: "/users/authentication",
      data: { email, password },
    });

    if (!response.success) {
      throw new Error(response.error || "Authentication failed");
    }

    const token = response.data.authentication_token.token;
    await setAuthToken(token);
    showMainContent();
    loadUserInfo();
    loadRecentPastes();
  } catch (error) {
    console.error("Sign in error:", error);
    document.getElementById("signInError").textContent =
      "Sign in failed. Please try again.";
  }
}

async function handleSignOut() {
  await setAuthToken(null);
  showSignInForm();
  document.getElementById("userInfo").textContent = "";
  document.getElementById("pasteList").innerHTML = "";
}

async function loadUserInfo() {
  try {
    const email = await getUserEmail();
    const response = await sendMessage({
      action: "apiRequest",
      method: "POST",
      endpoint: "/users/email",
      data: { email },
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch user info");
    }

    document.getElementById("userInfo").textContent =
      `Signed in as ${response.data.user.name}`;
  } catch (error) {
    console.error("Error loading user info:", error);
    document.getElementById("userInfo").textContent = "Error loading user info";
  }
}

async function loadRecentPastes() {
  try {
    const response = await sendMessage({
      action: "apiRequest",
      method: "GET",
      endpoint: "/texts",
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch recent pastes");
    }

    displayRecentPastes(response.data.texts);
  } catch (error) {
    console.error("Error loading recent pastes:", error);
    displayMessage("Error loading recent pastes. Please try again.");
  }
}

function displayRecentPastes(pastes) {
  const pasteList = document.getElementById("pasteList");
  pasteList.innerHTML = "";

  if (pastes && pastes.length > 0) {
    pastes.slice(0, 5).forEach((paste) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `https://textbin.theenthusiast.dev/${paste.slug}`;
      a.textContent = paste.title || "Untitled";
      a.target = "_blank";
      li.appendChild(a);
      pasteList.appendChild(li);
    });
  } else {
    displayMessage("No recent pastes found.");
  }
}

function displayMessage(message) {
  const pasteList = document.getElementById("pasteList");
  pasteList.innerHTML = `<p>${message}</p>`;
}

async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], function (result) {
      resolve(result.authToken);
    });
  });
}

async function setAuthToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authToken: token }, resolve);
  });
}

async function getUserEmail() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["userEmail"], function (result) {
      resolve(result.userEmail);
    });
  });
}

function viewProfile() {
  chrome.tabs.create({ url: "https://textbin.theenthusiast.dev/profile" });
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  const isDarkTheme = document.body.classList.contains("dark-theme");
  chrome.storage.local.set({ darkTheme: isDarkTheme });
}

async function handleNewPaste(e) {
  e.preventDefault();

  const title = document.getElementById("pasteTitle").value;
  const content = document.getElementById("pasteContent").value;
  const format = document.getElementById("pasteFormat").value;
  const expiryValue = document.getElementById("expiryValue").value;
  const expiryUnit = document.getElementById("expiryUnit").value;
  const password = document.getElementById("encryptionKey").value;
  const isPrivate = document.getElementById("isPrivate").checked;

  if (!password) {
    alert("Encryption password is required");
    return;
  }

  try {
    const salt = generateSalt();
    const key = await generateKey(password, salt);
    const encryptedContent = await encryptText(content, key);

    const encryptionSalt = btoa(
      String.fromCharCode.apply(null, Array.from(salt)),
    );

    const response = await sendMessage({
      action: "apiRequest",
      method: "POST",
      endpoint: "/texts",
      data: {
        title: title, // Title is not encrypted
        content: encryptedContent,
        format: format,
        expiresValue: parseInt(expiryValue),
        expiresUnit: expiryUnit,
        is_private: isPrivate,
        encryptionSalt: encryptionSalt,
      },
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to create paste");
    }

    alert("Paste created successfully!");
    document.getElementById("pasteForm").reset();
    showMainContent();
    loadRecentPastes();
  } catch (error) {
    console.error("Error creating paste:", error);
    alert("Error creating paste. Please try again.");
  }
}

function displayRecentPastes(pastes) {
  const pasteList = document.getElementById("pasteList");
  pasteList.innerHTML = "";

  if (pastes && pastes.length > 0) {
    pastes.slice(0, 5).forEach((paste) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = paste.title || "Untitled";
      a.onclick = (e) => {
        e.preventDefault();
        showPasteDetails(paste);
      };
      li.appendChild(a);
      pasteList.appendChild(li);
    });
  } else {
    displayMessage("No recent pastes found.");
  }
}

function showPasteDetails(paste) {
  const detailsSection = document.createElement("div");
  detailsSection.innerHTML = `
    <h2>${paste.title}</h2>
    <p>Format: ${paste.format}</p>
    <p>Expires: ${new Date(paste.expires).toLocaleString()}</p>
    <div id="encryptedContent">
      <p>This content is encrypted. Enter the password to decrypt:</p>
      <input type="password" id="decryptionPassword" placeholder="Decryption Password">
      <button id="decryptButton">Decrypt</button>
    </div>
    <pre id="decryptedContent" style="display: none;"></pre>
  `;

  const mainContent = document.getElementById("mainContent");
  mainContent.innerHTML = "";
  mainContent.appendChild(detailsSection);

  const decryptButton = document.getElementById("decryptButton");
  decryptButton.addEventListener("click", () => decryptPaste(paste));
}

async function decryptPaste(paste) {
  const password = document.getElementById("decryptionPassword").value;
  if (!password) {
    alert("Please enter the decryption password");
    return;
  }

  try {
    const salt = Uint8Array.from(atob(paste.encryption_salt), (c) =>
      c.charCodeAt(0),
    );
    const key = await generateKey(password, salt);
    const decryptedContent = await decryptText(paste.content, key);

    const decryptedContentElement = document.getElementById("decryptedContent");
    decryptedContentElement.textContent = decryptedContent;
    decryptedContentElement.style.display = "block";

    document.getElementById("encryptedContent").style.display = "none";
  } catch (error) {
    console.error("Decryption error:", error);
    alert(
      "Failed to decrypt the content. Please check your password and try again.",
    );
  }
}

function generateSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return array;
}

async function generateKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptText(text, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data,
  );

  const encryptedArray = new Uint8Array(encryptedData);
  const resultArray = new Uint8Array(iv.length + encryptedArray.length);
  resultArray.set(iv);
  resultArray.set(encryptedArray, iv.length);

  return btoa(String.fromCharCode.apply(null, Array.from(resultArray)));
}

async function decryptText(encryptedText, key) {
  const encryptedData = new Uint8Array(
    atob(encryptedText)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );
  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);

  const decryptedData = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

function loadThemePreference() {
  chrome.storage.local.get(["darkTheme"], function (result) {
    if (result.darkTheme) {
      document.body.classList.add("dark-theme");
    }
  });
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
