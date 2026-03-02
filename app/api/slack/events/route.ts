import { NextResponse } from 'next/server';
import { verifySlackRequest, processSlackEvent } from '@/lib/slack';

/**
 * Slack Events API webhook.
 *
 * Configure this URL in your Slack App → Event Subscriptions:
 *   https://<your-domain>/api/slack/events
 *
 * Subscribe to bot events: `app_mention`, `message.im`
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // ── Verify request signature ──
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret) {
    if (!verifySlackRequest(signingSecret, request.headers, rawBody)) {
      console.warn('[Slack] Invalid request signature — rejecting');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── URL verification challenge (Slack sends this once when you save the URL) ──
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // ── Event callback ──
  if (body.type === 'event_callback') {
    const event = body.event as Record<string, unknown>;

    if (event.type === 'app_mention' || event.type === 'message') {
      // Ignore message_changed, bot messages, etc.
      if (event.subtype) {
        return new NextResponse(null, { status: 200 });
      }

      const botUserId =
        ((body.authorizations as Array<{ user_id: string }>) ?? [])[0]
          ?.user_id || '';

      // Process the event. We await it so the serverless function stays alive
      // until the reply is sent. For most queries this takes < 2 s.
      try {
        await processSlackEvent(event, botUserId);
      } catch (err) {
        console.error('[Slack] Error processing event:', err);
      }
    }
  }

  // Always acknowledge with 200 so Slack doesn't retry
  return new NextResponse(null, { status: 200 });
}
