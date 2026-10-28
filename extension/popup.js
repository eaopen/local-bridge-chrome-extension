import { hostMatch, sanitizePage, formatContext, validateHostName, HOST_NAME, MAX_SELECTION } from './lib/protocol.js';

const $ = id => document.getElementById(id);
let context = { url: '', title: '', selection: '' };
let origin = null;
let enabled = false;
let tabId = null;
const notify = message => { $('status').textContent = message; };
const bridgeMessage = message => chrome.runtime.sendMessage(message);

function editableContext() {
  return sanitizePage({ ...context, selection: $('preview').value });
}
function isPage(url) {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); }
  catch { return false; }
}
async function refreshSite() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  tabId = tab?.id ?? null;
  if (!tab || !isPage(tab.url)) {
    origin = null;
    $('site').disabled = true;
    $('siteHint').textContent = 'This Chrome page cannot enable website integration.';
    return;
  }
  origin = new URL(tab.url).origin;
  const result = await bridgeMessage({ type: 'GET_SITE', origin });
  enabled = Boolean(result?.allowed);
  $('site').disabled = false;
  $('site').textContent = enabled ? 'Disable this site' : 'Allow this site';
  $('siteHint').textContent = `${origin} · ${enabled ? 'Read-only discovery enabled' : 'Not enabled'}`;
}
function updatePreview(ctx) {
  context = sanitizePage(ctx);
  $('pageTitle').textContent = context.title || '(untitled)';
  $('pageUrl').textContent = context.url;
  $('preview').value = context.selection;
}
$('capture').addEventListener('click', async () => {
  if (!Number.isInteger(tabId)) return notify('No tab available. You can still type a note.');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !isPage(tab.url)) return notify('Only ordinary web pages can be captured.');
    const result = await chrome.scripting.executeScript({ target: { tabId }, func: () => ({
      selection: (window.getSelection()?.toString() || '').slice(0, 16000),
      description: (document.querySelector('meta[name="description"]')?.getAttribute('content') || '').slice(0, 1000)
    }) });
    const extracted = result?.[0]?.result || {};
    const selection = extracted.selection || extracted.description || tab.title || '';
    updatePreview({ url: tab.url, title: tab.title, selection });
    notify(extracted.selection ? 'Selected text captured locally. Review before sharing.' : 'Page summary captured locally. You can edit it.');
  } catch {
    notify('This page does not allow capture. You can still type a note.');
  }
});
$('copy').addEventListener('click', async () => {
  const text = formatContext(editableContext());
  if (!text.trim()) return notify('Capture or type some content first.');
  try { await navigator.clipboard.writeText(text); notify('Copied locally.'); }
  catch { notify('Clipboard unavailable. Select and copy the text manually.'); }
});
$('save').addEventListener('click', () => {
  const text = formatContext(editableContext());
  if (!text.trim()) return notify('Capture or type some content first.');
  const href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'local-tool-bridge-context.txt';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  notify('Saved a local .txt copy.');
});

async function requestNative() {
  if (await chrome.permissions.contains({ permissions: ['nativeMessaging'] })) return true;
  // Called only from a user click handler; never from a web page.
  return chrome.permissions.request({ permissions: ['nativeMessaging'] });
}
$('native').addEventListener('click', async () => {
  if (!await requestNative()) return notify('Native Messaging permission was not granted.');
  notify('Checking installed local provider...');
  const reply = await bridgeMessage({ type: 'NATIVE_STATUS' });
  if (!reply?.ok) return notify(`Local provider unavailable (${reply?.code || 'unknown'}). Copy/Save still work.`);
  const provider = reply.result?.provider || 'native provider';
  const caps = Array.isArray(reply.result?.capabilities) ? reply.result.capabilities.join(', ') : '';
  $('providerStatus').textContent = `${provider}${caps ? ` · ${caps}` : ''}`;
  notify(reply.result?.connected_to_local_bridge ? 'Local Bridge provider is available.' : `Native provider detected (${provider}).`);
});
$('share').addEventListener('click', async () => {
  const edited = editableContext();
  if (!edited.selection.trim()) return notify('Capture or type content first.');
  if ($('preview').value.length > MAX_SELECTION) return notify('Content exceeds local sharing limit.');
  if (!await requestNative()) return notify('Native Messaging permission was not granted.');
  notify('Handing your reviewed content to the installed local provider...');
  const reply = await bridgeMessage({ type: 'SHARE_CONTEXT', context: edited });
  if (!reply?.ok) return notify(`Cannot hand off content (${reply?.code || 'unknown'}).`);
  if (reply.result?.forwarded === true) notify('Provider confirmed forwarding the content. Check the provider for task completion.');
  else notify('Provider acknowledged receipt; no completed AI/file task was confirmed.');
});
$('summarize').addEventListener('click', async () => {
  const edited = editableContext();
  if (!edited.selection.trim()) return notify('Capture or type some content first.');
  if ($('preview').value.length > MAX_SELECTION) return notify('Content exceeds local summary limit.');
  if (!await requestNative()) return notify('Native Messaging permission was not granted.');
  const button = $('summarize');
  button.disabled = true;
  $('summaryBox').hidden = true;
  $('summaryText').value = '';
  notify('Asking the installed local provider to summarize your reviewed text...');
  try {
    const reply = await bridgeMessage({ type: 'SUMMARIZE_CONTEXT', context: edited });
    if (!reply?.ok) {
      return notify(`Local AI unavailable (${reply?.error || reply?.code || 'unknown'}). Copy/Save still work.`);
    }
    if (reply.result?.status !== 'completed' || typeof reply.result?.summary !== 'string') {
      return notify('The provider has not confirmed a completed summary.');
    }
    $('summaryText').value = reply.result.summary;
    $('summaryBox').hidden = false;
    notify('Summary completed by the selected local provider. You can copy it.');
  } catch {
    notify('The local summary request did not complete. Copy/Save still work.');
  } finally {
    button.disabled = false;
  }
});
$('summaryCopy').addEventListener('click', async () => {
  const summary = $('summaryText').value;
  if (!summary) return notify('No completed summary to copy.');
  try { await navigator.clipboard.writeText(summary); notify('Summary copied.'); }
  catch { notify('Clipboard unavailable. Select the summary text to copy.'); }
});
$('site').addEventListener('click', async () => {
  if (!origin) return;
  const next = !enabled;
  const pattern = hostMatch(origin);
  if (!pattern) return notify('This URL cannot be used for site integration.');
  if (next && !await chrome.permissions.request({ origins: [pattern] })) {
    return notify('Website permission was not granted.');
  }
  const reply = await bridgeMessage({ type: 'SITE_TOGGLE', origin, enabled: next });
  if (!reply?.ok) return notify(`Unable to update website permission (${reply?.code || 'unknown'}).`);
  enabled = next;
  if (!next) {
    const data = await chrome.storage.local.get('trustedSites');
    const remaining = Array.isArray(data.trustedSites) ? data.trustedSites : [];
    if (!remaining.some(x => hostMatch(x) === pattern)) {
      try { await chrome.permissions.remove({ origins: [pattern] }); } catch { /* Disabled in extension anyway. */ }
    }
  }
  if (next && Number.isInteger(tabId)) {
    try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); }
    catch { /* The registered script works after the next page navigation. */ }
  }
  $('site').textContent = enabled ? 'Disable this site' : 'Allow this site';
  $('siteHint').textContent = `${origin} · ${enabled ? 'Read-only discovery enabled' : 'Not enabled'}`;
  notify(enabled ? 'Only read-only availability is exposed to this site.' : 'Site integration disabled.');
});
$('hostSave').addEventListener('click', async () => {
  const value = $('hostName').value.trim();
  if (!validateHostName(value)) return notify('Enter a valid dot-separated Native Messaging host name.');
  const reply = await bridgeMessage({ type: 'HOST_SET', host: value });
  if (!reply?.ok) return notify(`Provider setting could not be saved (${reply?.code || 'unknown'}).`);
  $('providerStatus').textContent = `Selected host: ${reply.host}. Click Check provider to test it.`;
  notify('Native host name saved locally. The host must be installed separately.');
});
(async () => {
  $('hostName').value = HOST_NAME;
  try {
    const [host] = await Promise.all([
      bridgeMessage({ type: 'HOST_GET' }), refreshSite()
    ]);
    if (validateHostName(host?.host)) $('hostName').value = host.host;
  } catch { notify('Extension is not fully available. Try reopening the popup.'); }
})();
