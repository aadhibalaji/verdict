import { GavelHero } from "@/components/ui/gavel-hero";

export default function HomePage() {
  return (
    <GavelHero
      title="Verdict"
      description="Verdict helps you cut through the noise and get to a clear decision, fast."
      ctaHref="/dashboard"
      ctaLabel="Enter the courtroom"
    />
  );
}
