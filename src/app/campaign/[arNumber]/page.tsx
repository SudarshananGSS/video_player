import { CampaignClient } from "./campaign-client";

export default async function CampaignPage({ params }: { params: Promise<{ arNumber: string }> }) {
  const { arNumber } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <CampaignClient arNumber={arNumber} />
    </div>
  );
}
