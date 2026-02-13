import Script from 'next/script';

export function AdSenseScript() {
  const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;

  if (!publisherId) return null;

  return (
    <Script
      strategy="beforeInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
      crossOrigin="anonymous"
    />
  );
}
