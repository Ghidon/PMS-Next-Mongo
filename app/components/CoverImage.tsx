"use client";

import { useState } from "react";

function initialsFromName(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export default function CoverImage({
  src,
  creatorName,
  alt = "Project cover",
  className = "",
}: {
  src?: string | null;
  creatorName?: string | null;
  alt?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const initials = initialsFromName(creatorName);

  if (!src || errored) {
    // Fallback block with initials
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 font-semibold ${className}`}
        aria-label={alt}
      >
        <span className="text-3xl">{initials}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
