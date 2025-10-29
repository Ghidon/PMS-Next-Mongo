"use client";

import React, { useState } from "react";

export default function InviteMemberButton({
  projectId,
  onInvite,
}: {
  projectId: string;
  onInvite: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
      >
        Invite Member
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Invite to Project</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>

            {/* Submit to server action passed from page */}
            <form
              className="space-y-3"
              action={async (fd) => {
                try {
                  setErr(null);
                  await onInvite(fd);
                  setOpen(false);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Could not send invitation.");
                }
              }}
            >
              <div>
                <label className="block text-sm">User Email or ID</label>
                <input
                  name="user"
                  type="text"
                  required
                  placeholder="example@email.com or user id"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm">Permission Level</label>
                <select name="role" className="w-full rounded border px-3 py-2 text-sm" defaultValue="user">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
              >
                Send Invitation
              </button>
            </form>

            {err ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">
                The user will be added to the selected role. (No email sent yet.)
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
