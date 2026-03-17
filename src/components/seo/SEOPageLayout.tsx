import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function SectionCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold text-sb-text-primary">{title}</h2>
          <div className="space-y-4 leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function SEOPageLayout({
  title,
  subtitle,
  children,
  footerLinks,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerLinks: { href: string; label: string }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-sb-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SPORTSBLOCK
        </Link>

        <h1 className="mb-2 text-3xl font-bold">{title}</h1>
        <p className="mb-10 text-sm text-muted-foreground">{subtitle}</p>

        <div className="prose prose-sm max-w-none space-y-12 text-sb-text-primary dark:prose-invert">
          {children}
        </div>

        <div className="mt-12 border-t pt-8">
          <div className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-primary hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
