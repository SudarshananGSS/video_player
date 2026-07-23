import { WatchClient } from "./watch-client";

export default async function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <WatchClient token={token} />
    </div>
  );
}
