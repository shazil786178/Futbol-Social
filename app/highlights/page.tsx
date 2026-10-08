import { redirect } from "next/navigation";

/** Highlights hub redirects to the vertical Clips feed. */
export default function HighlightsPage() {
  redirect("/clips");
}
