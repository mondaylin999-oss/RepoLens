"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareCardButton({ repository, score, earned, complete, url }: {
  repository: string;
  score: number | null;
  earned: number;
  complete: boolean;
  url: string;
}) {
  const [busy, setBusy] = useState(false);

  function downloadCard() {
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) {
      setBusy(false);
      return;
    }

    const background = context.createLinearGradient(0, 0, 1200, 630);
    background.addColorStop(0, "#11142a");
    background.addColorStop(1, "#27235e");
    context.fillStyle = background;
    context.fillRect(0, 0, 1200, 630);
    context.fillStyle = "rgba(130, 108, 255, .16)";
    context.beginPath();
    context.arc(1080, 120, 260, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(55, 211, 181, .12)";
    context.beginPath();
    context.arc(130, 610, 220, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#a99bff";
    context.font = "600 27px system-ui, sans-serif";
    context.fillText("RepoLens  ·  REPOSITORY READINESS", 72, 88);
    context.fillStyle = "#ffffff";
    context.font = "700 62px system-ui, sans-serif";
    const nameLines = wrapLines(context, repository, 790, 2);
    nameLines.forEach((line, index) => context.fillText(line, 72, 210 + index * 76));

    context.fillStyle = "rgba(255, 255, 255, .1)";
    context.beginPath();
    context.roundRect(72, 395, 1056, 150, 22);
    context.fill();
    context.fillStyle = "#42dfbd";
    context.font = "700 74px system-ui, sans-serif";
    context.fillText(complete ? `${score ?? 0}/100` : `≥ ${earned}/100`, 104, 492);
    context.fillStyle = "#e6e6f4";
    context.font = "500 25px system-ui, sans-serif";
    context.fillText(complete ? "PORTFOLIO READINESS SCORE" : "PARTIAL SCORE · SOME CHECKS UNVERIFIED", 510, 478);
    context.fillStyle = "#b9b8d1";
    context.font = "400 21px system-ui, sans-serif";
    context.fillText(trimText(context, url, 560), 510, 518);
    context.fillStyle = "rgba(255, 255, 255, .65)";
    context.font = "400 19px system-ui, sans-serif";
    context.fillText("Based on public GitHub repository details", 72, 588);

    canvas.toBlob((blob) => {
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `${repository.replace(/[^A-Za-z0-9_.-]+/g, "-")}-readiness.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      setBusy(false);
    }, "image/png");
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={downloadCard} disabled={busy}>
      <Download aria-hidden="true" />{busy ? "Preparing card…" : "Download share card"}
    </Button>
  );
}

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      if (lines.length === maxLines - 1) {
        lines.push(trimText(context, [line, ...words.slice(index)].join(" "), maxWidth));
        return lines;
      }
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function trimText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  let result = text;
  while (result && context.measureText(result).width > maxWidth) result = `${result.slice(0, -2)}…`;
  return result;
}
