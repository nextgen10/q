import { NextResponse } from 'next/server';

const PLAYWRIGHT_POM_API_BASE = process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

export async function POST() {
  try {
    const response = await fetch(`${PLAYWRIGHT_POM_API_BASE}/api/heal/step`, {
      method: 'POST',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({ status: 'error', detail: 'Invalid backend response' }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', detail: error instanceof Error ? error.message : 'Failed to reach Playwright backend' },
      { status: 502 },
    );
  }
}
