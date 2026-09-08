"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="fatal-state">
      <p className="eyebrow">HomeSeek could not start</p>
      <h1>Check the database setup.</h1>
      <p>{error.message || "Unknown database error"}</p>
      <button className="run-button" onClick={reset}>Try again</button>
    </main>
  );
}
