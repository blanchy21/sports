import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read logo at build/startup time — Node.js runtime supports fs
const logoData = readFileSync(join(process.cwd(), 'public', 'sportsblock-logo-trans.png'));
const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Sportsblock';
  const author = searchParams.get('author') || '';

  // Truncate title at ~100 chars
  const displayTitle = title.length > 100 ? title.slice(0, 97) + '...' : title;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoBase64} alt="" width={64} height={64} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: '16px',
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '1000px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayTitle}
        </div>
        {author && (
          <div
            style={{
              fontSize: 28,
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            @{author}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
        }}
      >
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
