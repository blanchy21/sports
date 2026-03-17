import Link from 'next/link';

export function CTABanner({
  heading,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  heading: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center">
      <h2 className="mb-3 text-2xl font-bold text-sb-text-primary">{heading}</h2>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href={primaryHref}
          className="inline-flex items-center rounded-lg bg-primary px-6 py-3 font-semibold text-[#051A14] transition-colors hover:bg-primary/90"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center rounded-lg border border-sb-border px-6 py-3 font-semibold text-sb-text-primary transition-colors hover:bg-sb-turf"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
