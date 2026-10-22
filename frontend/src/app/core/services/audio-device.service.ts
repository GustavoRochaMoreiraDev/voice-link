import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioDeviceService {

  audioInputs = signal<MediaDeviceInfo[]>([]);
  selectedInputId = signal<string>('');
  permissionGranted = signal<boolean>(false);

  constructor() {
    this.checkPermissionAndEnumerate();
  }

  async checkPermissionAndEnumerate(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        this.audioInputs.set(inputs);

        if (inputs.length > 0 && !this.selectedInputId()) {
          this.selectedInputId.set(inputs[0].deviceId);
        }

        // Check if any device has a label (means permission was granted)
        const hasLabel = inputs.some((d) => d.label !== '');
        this.permissionGranted.set(hasLabel);
      }
    } catch (e) {
      console.warn('Error enumerating audio devices:', e);
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      this.permissionGranted.set(true);
      await this.checkPermissionAndEnumerate();
      return true;
    } catch (e: any) {
      console.warn('Microphone permission not granted in current popup. Opening permission tab in Chrome:', e);
      // In Chrome Extension popup, Chrome blocks native permission prompts.
      // We open an extension tab where Chrome immediately displays the native Allow/Block prompt!
      this.openPermissionTab();
      this.permissionGranted.set(false);
      return false;
    }
  }

  openPermissionTab(): void {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('index.html?mode=permission')
      });
    } else {
      window.open('index.html?mode=permission', '_blank');
    }
  }
}
