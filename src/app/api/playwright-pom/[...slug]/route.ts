/**
 * Catch-all proxy route for Playwright POM Studio backend.
 * Forwards any /api/playwright-pom/[...slug] request to the POM backend
 * running at PLAYWRIGHT_POM_API_BASE (default: http://localhost:8000).
 *
 * More-specific sibling routes (e.g. /tests/list, /locators) take precedence
 * over this catch-all due to Next.js route resolution order.
 */

import { NextRequest, NextResponse } from 'next/server';

const POM_BASE =
  process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

type Params = { slug: string[] };

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  attempts = 2,
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to reach Playwright POM backend');
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<Params> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const upstreamPath = `/api/${slug.join('/')}`;

  // Preserve query parameters
  const { search } = new URL(request.url);
  const upstreamUrl = `${POM_BASE}${upstreamPath}${search}`;

  try {
    // Forward body for non-GET requests
    const bodyInit =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined;

    // Forward relevant headers but strip host
    const forwardHeaders = new Headers();
    request.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower !== 'host' &&
        lower !== 'content-length' &&
        lower !== 'transfer-encoding'
      ) {
        forwardHeaders.set(key, value);
      }
    });

    const upstreamResponse = await fetchWithRetry(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: bodyInit,
      cache: 'no-store',
    });

    const responseBody = await upstreamResponse.arrayBuffer();
    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'transfer-encoding' && lower !== 'connection') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to reach Playwright POM backend';
    return NextResponse.json(
      { error: message, upstream: upstreamUrl },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
