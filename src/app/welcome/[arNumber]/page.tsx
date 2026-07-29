import { WelcomeClient } from "./welcome-client";

export default async function WelcomePage({ params }: { params: Promise<{ arNumber: string }> }) {
  const { arNumber } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <WelcomeClient arNumber={arNumber} />
    </div>
  );
}
