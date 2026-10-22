import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExtensionStorageService {

  private isExtensionEnvironment(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      });
    }
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      });
    }
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => resolve());
      });
    }
    localStorage.removeItem(key);
  }
}
