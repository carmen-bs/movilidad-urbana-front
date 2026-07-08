import { useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export const useApi = () => {
  const fetchApi = useCallback(async (endpoint, options = {}, authRequired = false) => {
    const token = localStorage.getItem("firebaseToken");
    
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (authRequired && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`Error API: ${res.status}`);
    }

    const contentType = res.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }

    return await res.text();
  }, []);

  return { fetchApi };
};