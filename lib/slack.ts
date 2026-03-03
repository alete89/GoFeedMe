import crypto from 'crypto';

// ─── Signature Verification ───────────────────────────────────────────────────

/**
 * Verify that a request truly came from Slack using HMAC-SHA256.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  signingSecret: string,
  headers: Headers,
  rawBody: string
): boolean {
  const timestamp = headers.get('x-slack-request-timestamp');
  const signature = headers.get('x-slack-signature');
  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes (replay attack protection)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
}

// ─── Slash Command Parsing ────────────────────────────────────────────────────

export interface SlashCommandPayload {
  command: string;
  text: string;
  userId: string;
  /** Slack handle, e.g. "john.doe" */
  userName: string;
  channelId: string;
  responseUrl: string;
}

export function parseSlashCommand(rawBody: string): SlashCommandPayload {
  const p = new URLSearchParams(rawBody);
  return {
    command:     p.get('command')      ?? '',
    text:        p.get('text')         ?? '',
    userId:      p.get('user_id')      ?? '',
    userName:    p.get('user_name')    ?? p.get('user_id') ?? 'Usuario',
    channelId:   p.get('channel_id')   ?? '',
    responseUrl: p.get('response_url') ?? '',
  };
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

/** Only visible to the user who ran the command. */
export function ephemeral(text: string) {
  return Response.json({ response_type: 'ephemeral', text });
}

/** Visible to everyone in the channel. */
export function inChannel(text: string) {
  return Response.json({ response_type: 'in_channel', text });
}
