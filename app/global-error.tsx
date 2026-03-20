"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  console.error('Global error:', error);
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-2">Unexpected error</h1>
        <button onClick={() => reset()} className="px-4 py-2 rounded bg-black text-white">Try again</button>
      </div>
    </div>
  );
}