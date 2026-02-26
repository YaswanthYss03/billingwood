'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Apply theme to DOM
  const applyTheme = useCallback((darkMode: boolean) => {
    console.log('🎨 applyTheme called with:', darkMode);
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      console.log('✅ Added dark class to DOM');
    } else {
      html.classList.remove('dark');
      console.log('✅ Removed dark class from DOM');
    }
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
    console.log('💾 Saved to localStorage:', darkMode);
    console.log('📋 Current HTML classes:', html.className);
    console.log('🔍 Has dark class?', html.classList.contains('dark'));
  }, []);

  // Load theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      console.log('🚀 Initializing theme...');
      try {
        // Try to load from API first
        const response = await api.tenants.getSettings();
        const darkModeFromAPI = response.data.settings.darkMode || false;
        console.log('📡 Loaded from API:', darkModeFromAPI);
        
        applyTheme(darkModeFromAPI);
        setIsDarkMode(darkModeFromAPI);
      } catch (error) {
        console.log('⚠️ API load failed, using fallback');
        // Fallback to localStorage if API fails
        const savedTheme = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialDarkMode = savedTheme !== null ? savedTheme === 'true' : prefersDark;
        console.log('📱 Fallback value:', initialDarkMode, '(localStorage:', savedTheme, ', system:', prefersDark, ')');
        
        applyTheme(initialDarkMode);
        setIsDarkMode(initialDarkMode);
      } finally {
        setMounted(true);
        console.log('✅ Theme initialization complete');
      }
    };

    initializeTheme();
  }, [applyTheme]);

  // Save theme when it changes
  const saveThemeToDatabase = useCallback(async (darkMode: boolean) => {
    console.log('💿 Saving to database:', darkMode);
    try {
      const response = await api.tenants.getSettings();
      const currentSettings = response.data.settings;
      
      await api.tenants.updateSettings({
        ...currentSettings,
        darkMode: darkMode,
      });
      console.log('✅ Database save successful');
    } catch (error) {
      console.error('❌ Failed to save dark mode preference:', error);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    console.log('🔄 toggleDarkMode called, current state isDarkMode:', isDarkMode);
    
    setIsDarkMode((prev) => {
      const newValue = !prev;
      console.log('🔄 Inside setState: Toggling from', prev, 'to', newValue);
      return newValue;
    });
  }, [isDarkMode]);

  // Apply theme when isDarkMode changes
  useEffect(() => {
    if (mounted) {
      console.log('⚡ isDarkMode changed to:', isDarkMode);
      applyTheme(isDarkMode);
      saveThemeToDatabase(isDarkMode);
    }
  }, [isDarkMode, mounted, applyTheme, saveThemeToDatabase]);

  const setDarkMode = useCallback((value: boolean) => {
    console.log('⚙️ setDarkMode called with:', value);
    setIsDarkMode(value);
    applyTheme(value);
    saveThemeToDatabase(value);
  }, [applyTheme, saveThemeToDatabase]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
