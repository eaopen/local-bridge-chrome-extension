/** Optional development-only Native Messaging reference host (Node 20+).
 *  NOT a Local Bridge adapter, NOT included in Chrome Web Store package.
 *  Parses Chrome's 32-bit little-endian lengths on Windows/macOS/Linux.
 *  No filesystem reads, remote network, commands, or message persistence.
 */
import { stdin, stdout } from 'node:process';
import { encodeFrame, FrameParser, handleNative } from './reference-protocol.mjs';

const parser = new FrameParser((input) => {
  const response = handleNative(input);
  stdout.write(encodeFrame(response));
});
stdin.on('data', bytes => {
  try { parser.push(bytes); }
  catch { process.exitCode = 1; stdin.pause(); }
});
stdin.on('error', () => { process.exitCode = 1; });
