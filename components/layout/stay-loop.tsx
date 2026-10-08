import Link from "next/link";

/** Persistent “don’t leave” cue — next live room or unfinished daily job. */
export function StayLoop({
  href,
  label,
  live,
}: {
  href: string;
  label: string;
  live?: boolean;
}) {
  return (
    <aside className="fs-stay">
      <Link href={href}>
        {live ? "Still on · " : "Next · "}
        {label}
      </Link>
    </aside>
  );
}
