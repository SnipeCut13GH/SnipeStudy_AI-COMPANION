import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved !== null && saved !== 'undefined') {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing JSON from localStorage', error);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

// Fix: Import Dispatch and SetStateAction from React to correctly type the hook's return value.
export const useLocalStorage = <T,>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error setting item to localStorage', error);
        // Here you could show a toast to the user
        // e.g., showToast('Could not save settings, storage might be full.');
    }
  }, [key, value]);

  return [value, setValue];
};