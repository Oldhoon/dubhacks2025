export type ConsoleTheme = {
  id: string;
  name: string;
  description?: string;
};

export const CONSOLE_THEMES: ConsoleTheme[] = [
  { id: "monokai", name: "Monokai" },
  { id: "solarized-dark", name: "Solarized Dark" },
  { id: "dracula", name: "Dracula" },
  { id: "one-light", name: "One Light" },
];

export type ConsoleThemeId = (typeof CONSOLE_THEMES)[number]["id"];
