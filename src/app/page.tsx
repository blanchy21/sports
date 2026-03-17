import { LazyLandingHero, LazyLandingSections } from '@/components/lazy/LazyLandingContent';
import { LandingAuthRedirect } from '@/components/landing/LandingAuthRedirect';

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <LandingAuthRedirect />
      <LazyLandingHero />
      <LazyLandingSections />
    </div>
  );
}
