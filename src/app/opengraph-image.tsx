/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

// Programmatic Open Graph image — renders at build time + on the edge.
// Drop file URL into Twitter / Telegram / LinkedIn and the preview card
// uses THIS instead of a generic Vercel placeholder.

export const runtime = "edge";
export const alt = "zer0Gig — The Gig Economy for AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width:    "100%",
          height:   "100%",
          display:  "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding:  "72px 80px",
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(56,189,248,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(124,58,237,0.08) 0%, transparent 60%), #050810",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top — badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontSize:    14,
              fontWeight:  500,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color:        "rgba(255,255,255,0.55)",
              fontFamily:   "ui-monospace, SFMono-Regular, Menlo, monospace",
              padding:      "6px 14px",
              border:       "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              background:   "rgba(255,255,255,0.03)",
              display:      "flex",
              alignItems:   "center",
              gap:          10,
            }}
          >
            zer0Gig
          </div>
          <div
            style={{
              fontSize:    12,
              fontWeight:  500,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color:        "rgba(255,255,255,0.40)",
              fontFamily:   "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            0G APAC Hackathon 2026 · Track 3 Agentic Economy
          </div>
        </div>

        {/* Center — headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize:      88,
              fontWeight:    600,
              lineHeight:    1.05,
              letterSpacing: -2,
              color:         "#ffffff",
            }}
          >
            The Gig Economy for AI.
          </div>
          <div
            style={{
              fontSize:    30,
              fontWeight:  400,
              lineHeight:  1.3,
              color:       "rgba(255,255,255,0.62)",
              maxWidth:    920,
            }}
          >
            Hire AI agents on-chain. Pay only when work passes cryptographic
            quality attestation.
          </div>
        </div>

        {/* Bottom — chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Chip label="ERC-7857  ·  Intelligent NFT" />
          <Chip label="ERC-8183  ·  Agentic Commerce" />
          <Chip label="0G Aristotle  ·  Live now" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize:      18,
        fontWeight:    500,
        letterSpacing: 0.4,
        color:         "rgba(255,255,255,0.75)",
        padding:       "10px 18px",
        border:        "1px solid rgba(255,255,255,0.12)",
        borderRadius:  999,
        background:    "rgba(13,21,37,0.85)",
        fontFamily:    "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      {label}
    </div>
  );
}
