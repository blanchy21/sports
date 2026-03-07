import Link from 'next/link';

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/getting-started', label: 'Getting Started' },
  { href: '/earn-crypto-sports', label: 'Earn Crypto' },
  { href: '/medals-token', label: 'MEDALS Token' },
  { href: '/start-sports-blog', label: 'Start Blogging' },
  { href: '/discover', label: 'Discover' },
  { href: '/blog', label: 'Blog' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/community-guidelines', label: 'Guidelines' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="border-t py-6 xl:hidden">
      <nav
        aria-label="Footer navigation"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs text-muted-foreground"
      >
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} SPORTSBLOCK
      </p>
    </footer>
  );
};
