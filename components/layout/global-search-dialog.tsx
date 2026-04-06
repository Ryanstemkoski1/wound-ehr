"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearch, type SearchResult } from "@/app/actions/search";
import { Search, User, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const typeIcons: Record<SearchResult["type"], typeof User> = {
  patient: User,
  visit: Search,
  facility: Building2,
};

const typeLabels: Record<SearchResult["type"], string> = {
  patient: "Patient",
  visit: "Visit",
  facility: "Facility",
};

export function GlobalSearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Cmd+K / Ctrl+K keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await globalSearch(q);
      setResults(data);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 250);
    },
    [search]
  );

  // Navigate on select
  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      router.push(result.href);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  return (
    <>
      {/* Trigger button in header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm transition-colors dark:border-zinc-700"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="bg-muted hidden rounded px-1.5 py-0.5 font-mono text-[0.65rem] sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <VisuallyHidden>
            <DialogTitle>Search</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center border-b px-3">
            <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search patients, facilities…"
              className="h-11 border-0 shadow-none focus-visible:ring-0"
            />
            {isLoading && (
              <Loader2 className="text-muted-foreground ml-2 h-4 w-4 animate-spin" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto py-2">
            {results.length === 0 && query.length >= 2 && !isLoading && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No results found.
              </p>
            )}
            {results.length === 0 && query.length < 2 && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Type at least 2 characters to search…
              </p>
            )}
            {results.map((result, i) => {
              const Icon = typeIcons[result.type];
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{result.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {result.subtitle}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[0.65rem] uppercase">
                    {typeLabels[result.type]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer tips */}
          <div className="text-muted-foreground flex items-center gap-3 border-t px-3 py-2 text-[0.65rem]">
            <span>
              <kbd className="bg-muted rounded px-1 font-mono">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="bg-muted rounded px-1 font-mono">↵</kbd> Open
            </span>
            <span>
              <kbd className="bg-muted rounded px-1 font-mono">Esc</kbd> Close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
