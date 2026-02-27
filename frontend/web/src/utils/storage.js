import {
    DEFAULT_API_BASE,
    API_BASE_STORAGE_KEY,
    USER_EMAIL_STORAGE_KEY,
    USERNAME_STORAGE_KEY,
} from "./constants";

export function loadApiBase() {
    const params = new URL(window.location.href).searchParams;
    const paramBase = params.get("apiBase");
    if (paramBase && paramBase.trim()) {
        localStorage.setItem(API_BASE_STORAGE_KEY, paramBase.trim());
    }
    const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (stored) return stored;

    const envBase = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE : undefined;
    if (envBase && envBase.trim()) {
        return envBase.trim();
    }

    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
        return "http://localhost:8000/api";
    }

    return DEFAULT_API_BASE;
}

export function loadSavedList(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse saved list", key, error);
        return [];
    }
}

export function persistList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

export function loadUserProfile() {
    const envEmail = typeof import.meta !== "undefined" ? import.meta.env?.VITE_USER_EMAIL : undefined;
    const envUsername = typeof import.meta !== "undefined" ? import.meta.env?.VITE_USERNAME : undefined;
    const storedEmail = localStorage.getItem(USER_EMAIL_STORAGE_KEY);
    const storedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
    const email = (storedEmail || envEmail || "").trim();
    const username = (storedUsername || envUsername || "").trim();
    return { email, username };
}

export function persistUserProfile(user) {
    const email = (user?.email || "").trim();
    const username = (user?.username || "").trim();
    if (email) {
        localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
    } else {
        localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
    }
    if (username) {
        localStorage.setItem(USERNAME_STORAGE_KEY, username);
    } else {
        localStorage.removeItem(USERNAME_STORAGE_KEY);
    }
}
