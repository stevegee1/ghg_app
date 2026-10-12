/**
 * Removes personal data and secrets from an error report before it leaves the app. Used by the
 * server and the browser. Reports keep the error, stack trace, route and release only.
 */

interface ScrubbableEvent {
  request?: {
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
    url?: string;
  };
  user?: { id?: string | number; [field: string]: unknown };
}

const SECRET_QUERY = /([?&](?:token|session_id|tx_id|key|code|email)=)[^&#]*/gi;

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      for (const name of Object.keys(headers)) {
        if (/^(authorization|cookie|x-api-key|stripe-signature)$/i.test(name)) delete headers[name];
      }
      event.request.headers = headers;
    }
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.replace(SECRET_QUERY, '$1[removed]');
  }
  // Keep the internal user id for grouping; never the email, name or IP address.
  if (event.user) event.user = event.user.id !== undefined ? { id: event.user.id } : undefined;
  return event;
}
