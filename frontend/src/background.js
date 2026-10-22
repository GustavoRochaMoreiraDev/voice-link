// VoiceLink Background Service Worker (Manifest V3)
// Opens and manages a dedicated, persistent window so calls never drop when switching tabs.

let voiceLinkWindowId = null;

async function openVoiceLinkWindow() {
  if (voiceLinkWindowId !== null) {
    try {
      const existing = await chrome.windows.get(voiceLinkWindowId);
      if (existing) {
        await chrome.windows.update(voiceLinkWindowId, { focused: true });
        return;
      }
    } catch (e) {
      voiceLinkWindowId = null;
    }
  }

  const win = await chrome.windows.create({
    url: 'index.html?mode=window',
    type: 'popup',
    width: 440,
    height: 640,
    focused: true
  });
  voiceLinkWindowId = win.id;
}

// When user clicks the extension toolbar icon, open or focus the persistent window
chrome.action.onClicked.addListener(() => {
  openVoiceLinkWindow();
});

// Clean up stored ID when the window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === voiceLinkWindowId) {
    voiceLinkWindowId = null;
  }
});
