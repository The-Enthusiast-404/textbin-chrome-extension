const API_BASE_URL = "https://textbin.theenthusiast.dev/v1";
const WEB_APP_URL = "https://app.textbin.theenthusiast.dev";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const signInForm = document.getElementById("signInForm");
  const mainContent = document.getElementById("mainContent");
  const newPasteBtn = document.getElementById("newPasteBtn");
  const toggleThemeBtn = document.getElementById("toggleThemeBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const pasteForm = document.getElementById("pasteForm");
  const userInfo = document.getElementById("userInfo");

  loginForm.addEventListener("submit", handleSignIn);
  newPasteBtn.addEventListener("click", showNewPasteForm);
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
    loadUserData();
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
  document.getElementById("userTexts").style.display = "block";
}

function showNewPasteForm() {
  document.getElementById("newPasteForm").style.display = "block";
  document.getElementById("userTexts").style.display = "none";
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
    await setUserEmail(email);
    showMainContent();
    loadUserData();
  } catch (error) {
    console.error("Sign in error:", error);
    document.getElementById("signInError").textContent =
      "Sign in failed. Please try again.";
  }
}

async function handleSignOut() {
  await setAuthToken(null);
  await setUserEmail(null);
  showSignInForm();
  document.getElementById("userInfo").textContent = "";
  document.getElementById("userTexts").innerHTML = "";
}

async function loadUserData() {
  try {
    const email = await getUserEmail();
    const response = await sendMessage({
      action: "apiRequest",
      method: "POST",
      endpoint: "/users/email",
      data: { email },
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch user data");
    }

    const userData = response.data.user;
    displayUserInfo(userData);
    displayUserTexts(userData.texts);
  } catch (error) {
    console.error("Error loading user data:", error);
    document.getElementById("userInfo").textContent = "Error loading user data";
  }
}

function displayUserInfo(userData) {
  document.getElementById("userInfo").textContent =
    `Signed in as ${userData.name}`;
}

function displayUserTexts(texts) {
  const textList = document.getElementById("userTexts");
  textList.innerHTML = "<h2>Your Texts</h2>";

  if (texts && texts.length > 0) {
    const ul = document.createElement("ul");
    texts.forEach((text) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `${WEB_APP_URL}/${text.slug}`;
      a.textContent = text.title || "Untitled";
      a.target = "_blank";
      li.appendChild(a);
      ul.appendChild(li);
    });
    textList.appendChild(ul);
  } else {
    textList.innerHTML += "<p>No texts found.</p>";
  }
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
        title: title,
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
    loadUserData();
  } catch (error) {
    console.error("Error creating paste:", error);
    alert("Error creating paste. Please try again.");
  }
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

async function setUserEmail(email) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ userEmail: email }, resolve);
  });
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  const isDarkTheme = document.body.classList.contains("dark-theme");
  chrome.storage.local.set({ darkTheme: isDarkTheme });
  updateThemeButtonText();
}

function updateThemeButtonText() {
  const toggleThemeBtn = document.getElementById("toggleThemeBtn");
  const isDarkTheme = document.body.classList.contains("dark-theme");
  toggleThemeBtn.textContent = isDarkTheme ? "Light Theme" : "Dark Theme";
}

function loadThemePreference() {
  chrome.storage.local.get(["darkTheme"], function (result) {
    if (result.darkTheme) {
      document.body.classList.add("dark-theme");
    }
    updateThemeButtonText();
  });
}

function displayUserTexts(texts) {
  const textList = document.getElementById("userTexts");
  textList.innerHTML = "<h2>Your Texts</h2>";

  if (texts && texts.length > 0) {
    const ul = document.createElement("ul");
    texts.forEach((text) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `${WEB_APP_URL}/${text.slug}`;
      a.textContent = text.title || "Untitled";
      a.target = "_blank";
      li.appendChild(a);

      const details = document.createElement("p");
      details.textContent = `Format: ${text.format} | Expires: ${new Date(text.expires).toLocaleDateString()}`;
      details.className = "text-details";
      li.appendChild(details);

      ul.appendChild(li);
    });
    textList.appendChild(ul);
  } else {
    textList.innerHTML += "<p>No texts found.</p>";
  }
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
