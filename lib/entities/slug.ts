/** Stable URL-friendly key for players / teams. */
export function entitySlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Soft portrait — always works offline; real gallery photos attach via Shots. */
export function portraitUrl(name: string, kind: "player" | "team" = "player"): string {
  const bg = kind === "team" ? "1a2e22" : "181512";
  const color = kind === "team" ? "7eb8d9" : "f2e8d8";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=512&background=${bg}&color=${color}&bold=true&format=png&font-size=0.36`;
}

/** Hash → accent for fun color chips */
export function entityAccent(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hues = [200, 18, 145, 35, 280, 170];
  const hue = hues[h % hues.length];
  return `hsl(${hue} 42% 42%)`;
}
