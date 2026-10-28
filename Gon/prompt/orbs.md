Add the Orb effect from Libraries.dev to my React app.

Install:
npm install thinking-orbs

Usage:
import { ThinkingOrb } from 'thinking-orbs';

<ThinkingOrb state="searching" size={64} />

Props:
- state: "working" | "searching" | "solving" | "listening" | "connecting" | "weaving" | "composing" | "breathing" | "shaping"
- size: 64 (chat-avatar scale) or 20 (inline-text scale) — each is separately tuned
- speed: multiplies the animation clock, default 1
- dark: boolean, picks the light or dark tuning
- paused: boolean, freezes the animation

Orb replaces the spinner in an AI "thinking" state with nine hand-tuned animated
states. It ships zero runtime dependencies and needs React 18 or newer.
Docs: https://libraries.dev/orbs.html