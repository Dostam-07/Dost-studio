import { useState } from 'react';

interface ModelPickerProps {
  label: string;
  value: string;
  availableModels: string[];
  onChange: (value: string) => void;
  dotColor: string;
  hint: string;
}

export function ModelPicker({ label, value, availableModels, onChange, dotColor, hint }: ModelPickerProps) {
  const [custom, setCustom] = useState(false);

  const isInList = availableModels.includes(value);
  const showCustom = custom || (!isInList && value && availableModels.length > 0);

  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block text-muted-foreground flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} /> {label}
        <span className="text-muted-foreground/50 font-normal">({hint})</span>
      </label>
      {availableModels.length > 0 ? (
        <div className="flex gap-1">
          <select
            value={isInList ? value : '__custom__'}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setCustom(true);
              } else {
                setCustom(false);
                onChange(e.target.value);
              }
            }}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value="__custom__">Custom...</option>
          </select>
          {showCustom && (
            <input
              value={isInList ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type model name..."
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );
}
