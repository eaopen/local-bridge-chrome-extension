/** Native framing and reference handshake; Node module testable in isolation. */
const LIMIT = 256 * 1024; // reference host intentionally much smaller than Chrome's maximum

export function encodeFrame(message) {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  if (payload.length > LIMIT) throw new Error('Native message too large');
  const frame = Buffer.allocUnsafe(4 + payload.length);
  frame.writeUInt32LE(payload.length, 0);
  payload.copy(frame, 4);
  return frame;
}

export class FrameParser {
  constructor(handler) { this.handler = handler; this.buffer = Buffer.alloc(0); }
  push(bytes) {
    this.buffer = Buffer.concat([this.buffer, bytes]);
    while (this.buffer.length >= 4) {
      const size = this.buffer.readUInt32LE(0);
      if (size === 0 || size > LIMIT) throw new Error('Invalid native message length');
      if (this.buffer.length < 4 + size) return;
      const payload = this.buffer.subarray(4, 4 + size);
      this.buffer = this.buffer.subarray(4 + size);
      this.handler(JSON.parse(payload.toString('utf8')));
    }
  }
}

export function handleNative(request) {
  const id = typeof request?.request_id === 'string' ? request.request_id.slice(0, 80) : '';
  const base = { protocol_version: 1, request_id: id };
  if (request?.protocol_version !== 1 || !/^[\w.-]{1,80}$/.test(id)) {
    return { ...base, ok: false, error: 'protocol_or_request_id_invalid' };
  }
  if (request.action === 'host.status') {
    return { ...base, ok: true, result: {
      provider: 'reference-host', native_protocol: 1,
      connected_to_local_bridge: false,
      capabilities: ['host.status', 'context.share']
    } };
  }
  if (request.action === 'context.share') {
    const { title, url, selection } = request.payload || {};
    if ([title, url, selection].some(value => typeof value !== 'string')) {
      return { ...base, ok: false, error: 'invalid_context' };
    }
    if (Buffer.byteLength(JSON.stringify(request.payload), 'utf8') > 64 * 1024) {
      return { ...base, ok: false, error: 'payload_too_large' };
    }
    return { ...base, ok: true, result: {
      provider: 'reference-host', received: true, forwarded: false,
      note: 'Development host acknowledges only. It does not save or forward content.'
    } };
  }
  return { ...base, ok: false, error: 'unsupported_action' };
}
