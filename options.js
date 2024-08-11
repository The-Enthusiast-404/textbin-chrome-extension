// Saves options to chrome.storage
function saveOptions(e) {
  e.preventDefault();
  const form = document.getElementById("optionsForm");
  const options = {
    defaultExpiry: form.defaultExpiry.value,
    defaultPrivate: form.defaultPrivate.checked,
    showNotifications: form.showNotifications.checked,
  };

  chrome.storage.sync.set(options, function () {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(function () {
      status.textContent = "";
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get(
    {
      defaultExpiry: "1d",
      defaultPrivate: false,
      showNotifications: true,
    },
    function (items) {
      document.getElementById("defaultExpiry").value = items.defaultExpiry;
      document.getElementById("defaultPrivate").checked = items.defaultPrivate;
      document.getElementById("showNotifications").checked =
        items.showNotifications;
    },
  );
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("optionsForm").addEventListener("submit", saveOptions);
