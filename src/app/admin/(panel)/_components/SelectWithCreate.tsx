"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface Option {
  id: string;
  name: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  onCreated: (option: Option) => void;
  createEndpoint: string;
  placeholder?: string;
}

export default function SelectWithCreate({
  label,
  value,
  onChange,
  options,
  onCreated,
  createEndpoint,
  placeholder = "— None —",
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(createEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      onCreated(data);
      onChange(data.id);
      setNewName("");
      setCreating(false);
      toast.success(`"${data.name}" created`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-dark">{label}</span>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="text-xs text-blue hover:underline"
        >
          {creating ? "Cancel" : "+ New"}
        </button>
      </div>

      {creating ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())}
            placeholder={`New ${label.toLowerCase()} name`}
            className="flex-1 rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <button
            type="button"
            onClick={create}
            disabled={saving || !newName.trim()}
            className="rounded-lg bg-blue px-3 py-2 text-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-60"
          >
            {saving ? "…" : "Add"}
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
