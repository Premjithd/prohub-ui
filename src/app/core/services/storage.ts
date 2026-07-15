import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private memoryStorage = new Map<string, string>();

  // sessionStorage on the web so closing the window/tab ends the session.
  // The native Capacitor apps keep localStorage — sessionStorage is wiped
  // when the app process exits, which would force a login on every launch.
  private get store(): Storage {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return cap?.isNativePlatform?.() ? localStorage : sessionStorage;
  }

  getItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return this.store.getItem(key);
      } catch (e) {
        console.error(`StorageService.getItem failed for key=${key}`, e);
        return this.memoryStorage.get(key) || null;
      }
    }
    return this.memoryStorage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.store.setItem(key, value);
      } catch (e) {
        console.error(`StorageService.setItem failed for key=${key}`, e);
        this.memoryStorage.set(key, value);
      }
    } else {
      this.memoryStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.store.removeItem(key);
      } catch {
        this.memoryStorage.delete(key);
      }
    } else {
      this.memoryStorage.delete(key);
    }
  }

  clear(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.store.clear();
      } catch {
        this.memoryStorage.clear();
      }
    } else {
      this.memoryStorage.clear();
    }
  }
}
