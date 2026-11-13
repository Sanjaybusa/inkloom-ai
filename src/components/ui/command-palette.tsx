"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, Zap, Database, Settings, FileText, Shield, BarChart2, Plus, History, HelpCircle, Keyboard, Sun, Moon, Monitor, Copy } from "lucide-react";

interface Command {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: "workspace" | "evidence" | "passport" | "rules" | "dashboard") => void;
  activeTab: "workspace" | "evidence" | "passport" | "rules" | "dashboard";
  runId?: string | null;
  canRunGovernance: boolean;
  hasFindings: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  activeTab,
  runId,
  canRunGovernance,
  hasFindings,
  theme,
  toggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      const stored = localStorage.getItem("inkloom-recent-commands");
      if (stored) setRecentCommands(JSON.parse(stored));
    }
  }, [isOpen]);

  const commands = useMemo<Command[]>(() => [
    // Navigation
    { id: "nav-workspace", label: "Go to Workspace", description: "Main governance workspace", shortcut: "1", icon: <Shield className="w-5 h-5" />, category: "Navigation", action: () => onNavigate("workspace"), keywords: ["workspace", "main", "governance", "home"] },
    { id: "nav-evidence", label: "Go to Evidence Library", description: "Browse evidence records", shortcut: "2", icon: <Database className="w-5 h-5" />, category: "Navigation", action: () => onNavigate("evidence"), keywords: ["evidence", "library", "records", "browse"] },
    { id: "nav-passport", label: "Go to Trust Passport", description: "View generated passports", shortcut: "3", icon: <FileText className="w-5 h-5" />, category: "Navigation", action: () => onNavigate("passport"), keywords: ["passport", "trust", "report", "pdf"] },
    { id: "nav-rules", label: "Go to Rules Builder", description: "Visual policy-as-code editor", shortcut: "4", icon: <Settings className="w-5 h-5" />, category: "Navigation", action: () => onNavigate("rules"), keywords: ["rules", "builder", "policy", "yaml", "dsl"] },
    { id: "nav-dashboard", label: "Go to Dashboard", description: "Multi-campaign workspace", shortcut: "5", icon: <BarChart2 className="w-5 h-5" />, category: "Navigation", action: () => onNavigate("dashboard"), keywords: ["dashboard", "campaigns", "multi", "workspace"] },

    // Actions
    { id: "run-governance", label: "Run Governance Check", description: "Analyze content against rules", shortcut: "⌘R", icon: <Zap className="w-5 h-5" />, category: "Actions", action: () => { window.dispatchEvent(new CustomEvent("inkloom-run-governance")); onClose(); }, keywords: ["run", "check", "analyze", "governance", "scan"], disabled: !canRunGovernance },
    { id: "new-evidence", label: "Add Evidence Record", description: "Create new approved evidence", shortcut: "⌘E", icon: <Plus className="w-5 h-5" />, category: "Actions", action: () => { onNavigate("evidence"); window.dispatchEvent(new CustomEvent("inkloom-new-evidence")); onClose(); }, keywords: ["add", "create", "evidence", "record", "new"] },
    { id: "generate-passport", label: "Generate Trust Passport", description: "Export PDF/Markdown report", shortcut: "⌘P", icon: <FileText className="w-5 h-5" />, category: "Actions", action: () => { window.dispatchEvent(new CustomEvent("inkloom-generate-passport")); onClose(); }, keywords: ["generate", "export", "passport", "pdf", "report"], disabled: !hasFindings },
    { id: "copy-run-id", label: "Copy Run ID", description: "Copy current run ID to clipboard", shortcut: "⌘C", icon: <Copy className="w-5 h-5" />, category: "Actions", action: () => { if (runId) { navigator.clipboard.writeText(runId); onClose(); } }, keywords: ["copy", "run", "id", "clipboard"], disabled: !runId },

    // Theme
    { id: "toggle-theme", label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`, description: "Toggle color theme", shortcut: "⌘T", icon: theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />, category: "Appearance", action: () => { toggleTheme(); onClose(); }, keywords: ["theme", "dark", "light", "mode", "color"] },

    // Demo
    { id: "demo-mode", label: "Enable Judge Demo Mode", description: "Instant cached demo state", shortcut: "⌘D", icon: <Zap className="w-5 h-5" />, category: "Demo", action: () => { window.location.href = "?demo=perfect"; }, keywords: ["demo", "judge", "cached", "instant"] },
    { id: "guided-tour", label: "Start Guided Tour", description: "Interactive walkthrough", shortcut: "⌘/", icon: <HelpCircle className="w-5 h-5" />, category: "Help", action: () => { window.dispatchEvent(new CustomEvent("inkloom-guided-tour")); onClose(); }, keywords: ["tour", "guide", "walkthrough", "help", "tutorial"] },
    { id: "shortcuts", label: "Show Keyboard Shortcuts", description: "View all shortcuts", shortcut: "⌘?", icon: <Keyboard className="w-5 h-5" />, category: "Help", action: () => { window.dispatchEvent(new CustomEvent("inkloom-show-shortcuts")); onClose(); }, keywords: ["shortcuts", "keys", "hotkeys", "keyboard"] },
  ], [onNavigate, runId, canRunGovernance, hasFindings, theme, toggleTheme]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      const recent = recentCommands.map(id => commands.find(c => c.id === id)).filter(Boolean) as Command[];
      const others = commands.filter(c => !recentCommands.includes(c.id));
      return [...recent, { id: "divider", label: "All Commands", description: "", category: "", action: () => {}, keywords: [], icon: null } as any, ...others];
    }
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.keywords.some(k => k.includes(q)) ||
      c.shortcut?.toLowerCase().includes(q)
    );
  }, [query, commands, recentCommands]);

  const handleSelect = (command: Command) => {
    if (command.id === "divider") return;
    command.action();
    setRecentCommands(prev => {
      const updated = [command.id, ...prev.filter(id => id !== command.id)].slice(0, 5);
      localStorage.setItem("inkloom-recent-commands", JSON.stringify(updated));
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); const cmd = filteredCommands[selectedIndex]; if (cmd && cmd.id !== "divider") handleSelect(cmd); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5" />
            <div className="relative p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or search... (⌘K to open)"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">⌘K</kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {filteredCommands.map((command, index) => (
                command.id === "divider" ? (
                  <motion.div key="divider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">All Commands</p>
                  </motion.div>
                ) : (
                  <motion.button
                    key={command.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleSelect(command)}
                    disabled={command.disabled}
                    className={`w-full px-4 py-3 flex items-center gap-4 text-left transition-colors ${
                      index === selectedIndex
                        ? "bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    } ${command.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={{ borderLeft: index === selectedIndex ? "3px solid #3b82f6" : "3px solid transparent" }}
                  >
                    <div className={`p-2 rounded-xl ${index === selectedIndex ? "bg-blue-100 dark:bg-blue-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                      {command.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${command.disabled ? "text-slate-400" : "text-slate-900 dark:text-white"}`}>{command.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{command.description}</p>
                    </div>
                    {command.shortcut && (
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">{command.shortcut}</kbd>
                    )}
                    {index === selectedIndex && <ChevronRight className="w-5 h-5 text-blue-500" />}
                  </motion.button>
                )
              ))}
            </AnimatePresence>
            {filteredCommands.length === 0 && query && (
              <div className="px-4 py-8 text-center text-slate-500">
                <Search className="mx-auto text-slate-300" size={32} />
                <p className="mt-2">No commands found for "{query}"</p>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>↑↓ Navigate • ⏎ Select • ⎋ Close</span>
            <span className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">⌘K</kbd> Open Palette
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}