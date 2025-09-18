// src/components/TaskModal.tsx
'use client';
import React from 'react';

type Initial = {
  id?: string;
  name?: string;
  date?: string;
  task?: string;
  location?: string;
} | null;

type Props = {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onSaved?: () => void | Promise<void>;
  initial?: Initial;
  title?: string;
  children?: React.ReactNode;
};

export default function TaskModal({
  open,
  isOpen,
  onClose,
  onSaved,
  initial,
  title,
  children,
}: Props) {
  const visible = open ?? isOpen ?? false;
  if (!visible) return null;

  async function handleSave() {
    try { await onSaved?.(); }
    finally { onClose?.(); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-[min(92vw,680px)] rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title ?? 'Task'}</h3>
          <button className="rounded border px-2 py-1 text-sm" onClick={onClose}>Close</button>
        </div>

        {initial && (
          <div className="mb-3 text-sm text-gray-600">
            <div><b>ID:</b> {initial.id ?? '-'}</div>
            <div><b>Name:</b> {initial.name ?? '-'}</div>
            <div><b>Date:</b> {initial.date ?? '-'}</div>
            <div><b>Task:</b> {initial.task ?? '-'}</div>
            <div><b>Location:</b> {initial.location ?? '-'}</div>
          </div>
        )}

        <div>{children}</div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-1" onClick={onClose}>Cancel</button>
          <button className="rounded border px-3 py-1" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
