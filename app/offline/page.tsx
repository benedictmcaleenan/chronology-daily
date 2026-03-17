export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-5">📡</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Connect to the internet to play today&apos;s puzzle.
        </p>
      </div>
    </main>
  );
}
