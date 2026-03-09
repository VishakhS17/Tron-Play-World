import React from "react";
import { Controller, Control } from "react-hook-form";

interface TagInputProps {
  name: string;
  label?: string;
  control: Control<any>;
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  name,
  label = "Enter tags",
  control,
  placeholder = "Type and press enter...",
}) => {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={[]}
      render={({ field }) => {
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          const value = e.currentTarget.value.trim();
          if ((e.key === "Enter" || e.key === ",") && value) {
            e.preventDefault();
            const current = field.value || [];
            if (!current.includes(value)) {
              field.onChange([...current, value]);
            }
            e.currentTarget.value = "";
          }
        };

        const removeTag = (tagToRemove: string) => {
          const updated = field.value?.filter(
            (tag: string) => tag !== tagToRemove
          );
          field.onChange(updated);
        };

        return (
          <div>
            {label && (
              <label className="block mb-1.5 text-sm text-gray-6">
                {label}
              </label>
            )}

            <input
              type="text"
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-4 py-3 duration-200 border rounded-lg border-gray-3 placeholder:text-sm h-11 placeholder:text-dark-5 outline-hidden focus:border-blue focus:ring-0"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {(field.value || []).map((tag: string) => (
                <div
                  key={tag}
                  className="bg-gray-2 text-dark px-3 py-1 rounded-full text-sm flex items-center gap-1 mb-1.5"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-2xl text-red hover:text-red"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
};
