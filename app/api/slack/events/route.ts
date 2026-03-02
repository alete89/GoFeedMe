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
  const contentType = request.headers.get('content-type') || '';
  console.log('[Slack] POST /api/slack/events — content-type:', contentType);

  const rawBody = await request.text();
  console.log('[Slack] raw body:', rawBody.slice(0, 500));

  // ── Verify request signature ──
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret) {
    if (!verifySlackRequest(signingSecret, request.headers, rawBody)) {
      console.warn('[Slack] Invalid request signature — rejecting');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[Slack] SLACK_SIGNING_SECRET not set — skipping signature check');
  }

  // ── Slash commands send application/x-www-form-urlencoded ──
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody);
    const command = params.get('command');
    const text = params.get('text') || '';
    const userName = params.get('user_name') || params.get('user_id') || 'Usuario';
    const responseUrl = params.get('response_url');

    console.log('[Slack] slash command:', command, '| text:', text, '| user:', userName);

    // Acknowledge immediately (Slack requires a response within 3 s)
    // Then process in background and send delayed response via response_url
    if (responseUrl) {
      // Fire-and-forget: process after responding
      (async () => {
        try {
          const { processSlackSlashCommand } = await import('@/lib/slack');
          const reply = await processSlackSlashCommand(text, userName);
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: reply, response_type: 'in_channel' }),
          });
        } catch (err) {
          console.error('[Slack] Error processing slash command:', err);
        }
      })();
    }

    return NextResponse.json({ text: '⏳ Un momento...' });
  }

  // ── JSON events (Event Subscriptions) ──
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('[Slack] Failed to parse JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[Slack] event type:', body.type);

  // ── URL verification challenge (Slack sends this once when you save the URL) ──
  if (body.type === 'url_verification') {
    console.log('[Slack] responding to url_verification challenge');
    return NextResponse.json({ challenge: body.challenge });
  }

  // ── Event callback ──
  if (body.type === 'event_callback') {
    const event = body.event as Record<string, unknown>;
    console.log('[Slack] event callback — event.type:', event.type, '| subtype:', event.subtype);

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
