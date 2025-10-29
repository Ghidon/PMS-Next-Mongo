"use client";

import { useRef } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>; // Server Action
  className?: string;
};

export default function ChangeCoverForm({ action, className }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form action={action} className={className}>
      <label
        className="inline-flex items-center gap-2 border rounded px-3 py-1 bg-white/90 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <span className="text-sm">Change cover</span>
        <input
          ref={inputRef}
          type="file"
          name="cover"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.currentTarget.files && e.currentTarget.files.length > 0) {
              // Auto-submit as soon as a file is chosen
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </label>
    </form>
  );
}
