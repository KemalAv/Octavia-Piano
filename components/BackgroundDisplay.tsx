import React, { useMemo } from "react";
import { ThemeSettings, ViewMode } from "../types";

export const BackgroundDisplay: React.FC<{
  themeSettings: ThemeSettings;
  viewMode: ViewMode;
  isFreePlayMode: boolean;
  instrumentMode?: "piano" | "drum";
  songBackgroundUrl?: string | null;
}> = ({
  themeSettings,
  viewMode,
  isFreePlayMode,
  instrumentMode,
  songBackgroundUrl,
}) => {
  const { backgroundUrl: globalBackgroundUrl, backgroundOpacity } =
    themeSettings;
  const backgroundUrl = songBackgroundUrl || globalBackgroundUrl;

  const isSheetMode =
    viewMode === "sheet" ||
    viewMode === "sheet-roll" ||
    viewMode === "sheet-qwerty";
  const backingLayerClass =
    viewMode === "falling" ||
    isFreePlayMode ||
    (instrumentMode === "drum" && !isSheetMode)
      ? "bg-black"
      : "bg-white";

  // Aligned with Piano Mode: Respect fallingNotesBackgroundColor if media is clear
  const customBgColor = themeSettings.fallingNotesBackgroundColor;
  const backingLayerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: customBgColor || (backingLayerClass === "bg-black" ? "#000000" : "#ffffff"),
  };

  if (!backgroundUrl) {
    return <div style={backingLayerStyle} />;
  }

  const isVideo = useMemo(
    () =>
      backgroundUrl.startsWith("data:video/") ||
      backgroundUrl.toLowerCase().endsWith(".mp4") ||
      backgroundUrl.toLowerCase().endsWith(".webm"),
    [backgroundUrl],
  );
  const opacity = backgroundOpacity ?? 0.1;
  const commonStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: opacity,
    transition: "opacity 300ms ease-in-out",
  };

  return (
    <>
      <div style={backingLayerStyle} />
      {isVideo ? (
        <video
          key={backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{ ...commonStyle, objectFit: "cover" }}
          src={backgroundUrl}
        />
      ) : (
        <div
          style={{
            ...commonStyle,
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
    </>
  );
};
