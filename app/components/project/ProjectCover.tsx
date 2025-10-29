"use client";

import React from "react";
import CoverImage from "@/app/components/CoverImage";
import ChangeCoverIcon from "@/app/components/project/ChangeCoverIcon";

type Props = {
  src: string;
  alt?: string;
  creatorName?: string | null;
  onChangeCover: (formData: FormData) => Promise<void>;
  className?: string;
};

export default function ProjectCover({
  src,
  alt = "Project cover",
  creatorName,
  onChangeCover,
  className = "",
}: Props) {
  return (
    <section className={`relative w-full ${className}`}>
      <CoverImage
        src={src}
        creatorName={creatorName ?? undefined}
        alt={alt}
        className="h-48 w-full rounded-2xl border object-cover object-top"
      />
      <div className="absolute right-3 top-3">
        <ChangeCoverIcon onChangeCover={onChangeCover} />
      </div>
    </section>
  );
}
