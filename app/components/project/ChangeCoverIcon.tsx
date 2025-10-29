"use client";

import React, { useRef } from "react";

export default function ChangeCoverIcon({
  onChangeCover,
}: {
  onChangeCover: (formData: FormData) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handlePick = () => {
    // Reset value so selecting the same file twice still triggers 'change'
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = () => {
    if (!inputRef.current?.files || inputRef.current.files.length === 0) return;
    formRef.current?.requestSubmit();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handlePick}
        title="Change cover"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 backdrop-blur hover:bg-white"
      >
        {/* simple inline icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h2l1-2h6l1 2h2a2 2 0 0 1 2 2v3H3V7Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 10h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </button>

      {/* Hidden form + input */}
      <form action={onChangeCover} ref={formRef} className="hidden">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/*"
          onChange={handleChange}
        />
      </form>
    </div>
  );
}
