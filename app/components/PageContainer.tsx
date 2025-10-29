import React from "react";

type Props = { children: React.ReactNode; className?: string };
export default function PageContainer({ children, className = "" }: Props) {
  return (
    <main className={`mx-auto w-full max-w-6xl px-4 pb-12 pt-6 ${className}`}>
      {children}
    </main>
  );
}
