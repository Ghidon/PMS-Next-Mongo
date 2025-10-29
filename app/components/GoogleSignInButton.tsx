"use client";

import { signIn } from "next-auth/react";

export default function GoogleLoginButton({ callbackUrl = "/projects" }) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl })}
      className="btn btn-outline w-full"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8A6.4 6.4 0 0 1 5.6 12 6.4 6.4 0 0 1 12 5.6c1.8 0 3.1.8 3.8 1.5l2.6-2.5A10 10 0 0 0 12 2 10 10 0 0 0 2 12a10 10 0 0 0 10 10c5.8 0 9.7-4.1 9.7-9.8 0-.7-.1-1.1-.2-1.6H12z"/>
        <path fill="#34A853" d="M3.2 7.4 6.4 9.8A6.4 6.4 0 0 1 12 5.6c1.8 0 3.1.8 3.8 1.5l2.6-2.5A10 10 0 0 0 12 2 10 10 0 0 0 3.2 7.4z"/>
        <path fill="#4A90E2" d="M12 22a10 10 0 0 0 9.7-9.8c0-.7-.1-1.1-.2-1.6H12v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8-3.4 0-6.2-2.3-6.9-5.6l-3.2 2.4A10 10 0 0 0 12 22z"/>
        <path fill="#FBBC05" d="M5.1 14.6A6.7 6.7 0 0 1 5.6 12c0-.9.2-1.8.5-2.6L3.2 7.4A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.4l-3.2 1.8z"/>
      </svg>
      <span>Access with Google</span>
    </button>
  );
}
