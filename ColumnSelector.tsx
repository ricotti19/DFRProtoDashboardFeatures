//components /liveData/ColumnSelector.tsx
"use client";
import React, { useMemo, useState } from "react";

interface Props {
  allCols: string[]; // full list of columns that can be selected
  selected: Set<string>; // currently selected columns (external state passed in)
  onToggle: (col: string) => void; // callback to toggle a single column selection
  onSelectAll: () => void; // callback to select all columns (used when allCols.length <= maxSelect)
  onClear: () => void; // callback to clear all selections
  quickPick: (cols: string[]) => void; // helper to quickly select a list of columns
  /** maximum number of selectable columns (default 2) */
  maxSelect?: number;
}

/*
Small, self-contained UI to search and pick columns from a list of available columns
 - controlled callbacks for state mutations (onToggle, onSelectAll, onClear, quickPick)
 - enforces max number of selections (maxSelect)
 - in-component search, quick-pick helpers, and a temporary notice banner
 - doesn't own the "selected" state: it receives it via props and informs the parent
 - about changes through callbacks
 */
const ColumnSelector: React.FC<Props> = ({
  allCols,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  quickPick,
  maxSelect = 2, // default to 2 if not provided
}) => {
  // Local UI state -----------------------------------------------------------
  const [query, setQuery] = useState(""); // simple search query for client-side filtering
  const [notice, setNotice] = useState<string | null>(null); // small notice message (like when hitting maxSelect)

  // Compute a stable, filtered list of visible columns
  // useMemo avoids recalculating the filtered list on unrelated renders
  // case-insensitive; only runs when 'allCols' or 'query' changes
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCols; // fast return when search is empty
    return allCols.filter((c) => c.toLowerCase().includes(q));
  }, [allCols, query]);

  const selectedCount = selected.size; // for readability

  // Handler to toggle a column selection while enforcing the maxSelect limit
  // uses the passed-in 'selected' Set to inspect current selection size,
  // then calls onToggle to mutate selection in the parent
  // * not mutating 'selected' here *
  const handleToggle = (col: string) => {
    const isSelected = selected.has(col);

    // If column not selected and limit reached
    if (!isSelected && selectedCount >= maxSelect) {
      // short, user-friendly notice
      setNotice(`Max ${maxSelect} selections allowed — deselect one to add another.`);

      // Clear message after a short delay
      setTimeout(() => setNotice(null), 2200);
      return; // no calling onToggle because the change is blocked
    }

    // Forward the toggle action to the parent; parent owns update logic
    onToggle(col);
  };

  // if total number of columns is <= maxSelect, call onSelectAll 
  // otherwise, choose first 'maxSelect' items / subset
  // & call quickPick so the parent can set those values
  const handleSelectAll = () => {
    if (allCols.length <= maxSelect) {
      // Selecting all is safe
      onSelectAll();
    } else {
      // Otherwise pick the first `maxSelect` columns as default
      const toPick = allCols.slice(0, maxSelect);
      quickPick(toPick);
    }
  };

  // Render -------------------------------------------------------------------
  // simple utility classes
  // - Inputs have aria-labels
  // - Checkboxes reflect 'aria-checked' state
  // - Labels wrap inputs to increase click/tap target area
  // - textual feedback
  // Styling is kept minimal and intentionally className-driven for easy customization
    return (
    <div className="p-3 border rounded bg-white shadow-sm w-full">
      {/* Header: title + selected count + action buttons */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-medium">Columns</div>
          <div className="text-xs text-gray-500">
            {/* Selected count UI — shows current selections and the max allowed */}
            {selectedCount} selected {selectedCount > 0 ? ` / ${maxSelect}` : `/ ${maxSelect}`}
          </div>
        </div>

        <div className="flex gap-2">
          {/* "Select" button — uses the handleSelectAll logic which respects maxSelect */}
          <button
            onClick={handleSelectAll}
            className="px-2 py-1 text-sm border rounded bg-gray-50"
            title={`Select up to ${maxSelect}`}
          >
            Select
          </button>

          {/* "Clear" button — delegates to the parent via onClear */}
          <button
            onClick={() => {
              onClear();
            }}
            className="px-2 py-1 text-sm border rounded bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Search + Quick pick row */}
      <div className="flex gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search columns..."
          className="flex-1 px-2 py-1 border rounded text-sm"
          aria-label="Search columns"
        />
        {/* filters the preset list to only columns that actually exist */}
        <button
          className="text-xs px-2 py-1 border rounded bg-gray-100"
          onClick={() =>
            quickPick(
              [
                "Engine RPM",
                "Fuel Level",
                "Brake Temp FL",
                "Brake Temp FR",
                "Gear",
              ].filter((c) => allCols.includes(c))
            )
          }
        >
          Quick: Engine
        </button>
      </div>

      {/* Scrollable list of visible columns */}
      <div className="max-h-48 overflow-auto border-t pt-2">
        {visible.length === 0 ? (
          // empty state when no columns match the search
          <div className="text-xs text-gray-500 p-2">No columns match.</div>
        ) : (
          <ul className="grid grid-cols-1 gap-1 text-sm">
            {/* Render each visible column with a checkbox */}
            {visible.map((col) => {
              const isSelected = selected.has(col); // derive checked state from external 'selected'
              return (
                <li key={col} className="px-1">
                  {/* Label wraps input and text for a larger hit target and better accessibility */}
                  <label className="inline-flex items-center gap-2 cursor-pointer w-full">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(col)}
                      className="form-checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select column ${col}`}
                    />
                    {/* column name: using truncate + maxWidth prevents layout overflow */}
                    <span className="truncate" style={{ maxWidth: 260 }}>
                      {col}
                    </span>
                    {/* A visual indicator on the right side when the column is selected */}
                    {isSelected && (
                      <span className="ml-auto text-xs text-gray-500">Selected</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer: showing how many are visible and another quick-pick button */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          Showing <strong>{visible.length}</strong> / {allCols.length}
        </div>

        <div className="flex gap-2">
          {/* Another quick pick preset for a specific tire (example); filters against allCols */}
          <button
            onClick={() =>
              quickPick(
                [
                  "Tire Temp Outer FL",
                  "Tire Temp Middle FL",
                  "Tire Temp Inner FL",
                  "Tire Pressure FL",
                ].filter((c) => allCols.includes(c))
              )
            }
            className="text-xs px-2 py-1 border rounded bg-gray-50"
          >
            Quick: Front Left Tire
          </button>
        </div>
      </div>

      {/* Notice banner: shows when the user tries to exceed the selection limit */}
      {notice && (
        <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 p-1 rounded">{notice}</div>
      )}
    </div>
  );
};

export default ColumnSelector;
