const STORAGE_KEY = "cwn-roster";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadRoster() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistRoster(roster) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
}

export function saveCharacter(char) {
  const roster = loadRoster();
  const record = {
    id: generateId(),
    savedAt: Date.now(),
    character: char,
  };
  roster.push(record);
  persistRoster(roster);
  return record;
}

export function deleteCharacter(id) {
  const roster = loadRoster().filter((r) => r.id !== id);
  persistRoster(roster);
  return roster;
}

export function importCharacter(json) {
  try {
    const char = typeof json === "string" ? JSON.parse(json) : json;
    if (!char.name || !char.attributes || !char.hp || !char.level) {
      return { success: false, error: "Missing required fields (name, attributes, hp, level)" };
    }
    const record = saveCharacter(char);
    return { success: true, record };
  } catch (e) {
    return { success: false, error: e.message || "Invalid JSON" };
  }
}

export function exportCharacter(record) {
  const char = record.character;
  const blob = new Blob([JSON.stringify(char, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(char.name || "character").replace(/\s+/g, "_").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
