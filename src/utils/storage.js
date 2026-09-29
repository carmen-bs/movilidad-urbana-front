export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function isAuthenticated() {
  return !!localStorage.getItem("firebaseToken")|| !!localStorage.getItem("user");
}


export function getAuthUser() {
  return localStorage.getItem("user") || "";
}


export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("firebaseToken");
}