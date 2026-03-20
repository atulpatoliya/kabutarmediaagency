"use client";

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => { console.error('Client error boundary:', error); }, [error]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 mb-4">The page hit a client-side error. Try again.</p>
        <button onClick={() => reset()} className="px-4 py-2 rounded bg-black text-white">Reload</button>
      </div>
    </div>
  );
}