import { entityAccent } from "@/lib/entities/slug";

const SKIP = new Set(["fc", "cf", "afc", "sc", "ac", "club", "de", "the", "cd", "sv", "vfl", "vfb"]);

export function teamInitials(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w && !SKIP.has(w.toLowerCase()) && /[a-z]/i.test(w));
  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function TeamCrest({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={`fs-crest ${size === "lg" ? "fs-crest--lg" : ""}`}
      style={{ background: entityAccent(name) }}
    >
      {teamInitials(name)}
    </span>
  );
}
