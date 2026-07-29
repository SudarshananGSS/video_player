"use client";

import { useEffect, useState } from "react";
import { resolveWelcomeVideo } from "./actions";
import { MediaPlayer } from "@/components/media-player";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "This advisor hasn't published a welcome video yet.",
  unknown: "Something went wrong loading this video.",
};

type Media = { type: "video" | "image"; title: string | null; url: string; posterUrl: string | null };

export function WelcomeClient({ arNumber }: { arNumber: string }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    resolveWelcomeVideo(arNumber).then((result) => {
      setChecking(false);
      if (result.ok) {
        setMedia(result);
      } else {
        setError(ERROR_MESSAGES[result.error]);
      }
    });
  }, [arNumber]);

  if (checking) {
    return <p className="text-sm text-neutral-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-sm text-neutral-400">{error}</p>;
  }

  if (!media) return null;

  return <MediaPlayer type={media.type} url={media.url} posterUrl={media.posterUrl} title={media.title} />;
}
