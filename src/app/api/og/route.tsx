import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Sportsblock';
  const author = searchParams.get('author') || '';

  const displayTitle = title.length > 100 ? title.slice(0, 97) + '...' : title;
  const authorLine = author ? `@${author}` : '';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 60,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8' }}>SPORTSBLOCK</div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {displayTitle}
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8', marginTop: 16 }}>{authorLine}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 24, color: '#64748b' }}>sportsblock.app</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    }
  );
}
