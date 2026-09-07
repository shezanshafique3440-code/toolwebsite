import { ImageResponse } from 'next/og';
import { APP_NAME } from '@/lib/constants';

export const runtime = 'nodejs';
export const alt = `${APP_NAME} — AI product research for e-commerce sellers`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0d11',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0d11',
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ color: '#e7e9ee', fontSize: 26, fontWeight: 600 }}>{APP_NAME}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              color: '#ffffff',
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            <div>Find winning products</div>
            <div>before you spend money.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', color: '#98a2b3', fontSize: 27, lineHeight: 1.4 }}>
            <div>AI product research, competitor analysis, profitability</div>
            <div>and marketing insights — in one place.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['Product scoring', 'Competitor analysis', 'Profit calculator', 'Ad + SEO tools'].map((label) => (
            <div
              key={label}
              style={{
                border: '1px solid #232a33',
                borderRadius: 999,
                padding: '10px 20px',
                color: '#b9c0ca',
                fontSize: 21,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
