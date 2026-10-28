import { hostMatch, sanitizePage, formatContext, validateHostName, HOST_NAME, MAX_SELECTION } from './lib/protocol.js';
import { createPendingRelay, relayReturnPayload, relayReturnText,
  validatePendingRelay, webAiPrompt, webAiUrl } from './lib/web-ai-relay.js';

const $ = id => document.getElementById(id);
let context = { url: '', title: '', selection: '' };
let origin = null;
let enabled = false;
let aiEnabled = false;
let toolsEnabled = false;
let tabId = null;
let pendingRelay = null;
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
    $('siteAi').disabled = true;
    $('siteTools').disabled = true;
    $('siteHint').textContent = 'This Chrome page cannot enable website integration.';
    return;
  }
  origin = new URL(tab.url).origin;
  const result = await bridgeMessage({ type: 'GET_SITE', origin });
  enabled = Boolean(result?.allowed);
  aiEnabled = Boolean(result?.ai_enabled);
  toolsEnabled = Boolean(result?.tools_enabled);
  $('siteTools').disabled = false;
  $('siteTools').textContent = toolsEnabled
    ? "Disable this site's local MCP status"
    : "Enable this site's local MCP status";
  $('site').disabled = false;
  $('siteAi').disabled = false;
  $('siteAi').textContent = aiEnabled
    ? 'Disable this site\'s enterprise AI'
    : 'Enable this site\'s enterprise AI → local Pi';
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
function describePending() {
  const label = $('relayPending');
  if (!pendingRelay) {
    label.textContent = 'No task waiting for a reply.';
  } else {
    label.textContent = `Active handoff: ${pendingRelay.web_ai} · ${pendingRelay.task_ref || pendingRelay.relay_id} · ${pendingRelay.source.title || 'Selected text'}`;
  }
  for (const id of ['relayCopy', 'relayReturn', 'relayCapture', 'relayClear']) {
    $(id).disabled = !pendingRelay;
  }
}

function currentRelayReply(text) {
  const reply = {title:'', url:'', selection:text};
  return chrome.tabs.query({active:true,currentWindow:true}).then(tabs => {
    const tab = tabs[0];
    if (tab && isPage(tab.url)) {
      reply.title = tab.title || '';
      reply.url = tab.url || '';
    }
    return sanitizePage(reply);
  });
}
$('relayTarget').addEventListener('change', () => {
  $('relayCustomWrap').hidden = $('relayTarget').value !== 'custom';
});
$('relayStart').addEventListener('click', async () => {
  const selected = editableContext();
  const taskRef = $('relayTaskRef').value.trim();
  let prompt, destination, pending;
  try {
    destination = webAiUrl($('relayTarget').value, $('relayCustomUrl').value);
    prompt = webAiPrompt(selected, taskRef);
    pending = createPendingRelay(
      selected, $('relayTarget').value, taskRef,
      'rel-' + crypto.randomUUID().replaceAll('-', ''), Date.now()
    );
  } catch (error) {
    return notify(error.message);
  }
  try {
    // No service receives the prompt until the USER pastes it into Web Chat.
    await navigator.clipboard.writeText(prompt);
  } catch {
    return notify('Cannot copy the task. Check clipboard permission before opening Web AI.');
  }
  try {
    await chrome.storage.local.set({pendingRelay:pending});
    pendingRelay = pending;
    describePending();
    await chrome.tabs.create({url:destination,active:true});
  } catch {
    notify('Task copied; could not open Web AI. You can paste into a chat yourself.');
  }
});
$('relayAttach').addEventListener('click', async () => {
  const taskRef = $('relayTaskRef').value.trim();
  if (!taskRef) return notify('Enter an existing local task reference first.');
  try {
    const pending = createPendingRelay(
      {title:'Local Bridge task',url:'',selection:'Manual return-only task link'},
      $('relayTarget').value,taskRef,
      'rel-' + crypto.randomUUID().replaceAll('-', ''),Date.now()
    );
    await chrome.storage.local.set({pendingRelay:pending});
    pendingRelay = pending;
    describePending();
    notify('Local task linked. Paste a Web AI reply below to return it.');
  } catch(error) {
    notify(error.message || 'Could not link task');
  }
});
$('relayCapture').addEventListener('click', async () => {
  if (!pendingRelay) return notify('Start or restore a relay first.');
  try {
    const tab = (await chrome.tabs.query({active:true,currentWindow:true}))[0];
    if (!tab?.id || !isPage(tab.url)) return notify('Select text on a normal web page.');
    const selection = await chrome.scripting.executeScript({
      target:{tabId:tab.id},
      func:() => window.getSelection()?.toString().slice(0,16001) || ''
    });
    const text = selection?.[0]?.result || '';
    if (!text.trim()) return notify('No selected text found. Copy the reply and paste it below.');
    if (text.length > MAX_SELECTION) return notify('Reply is too long. Select a shorter excerpt.');
    $('relayReply').value = text;
    notify('Selected reply captured. Review before returning it.');
  } catch {
    notify('Cannot access selected text here. Copy and paste the reply manually.');
  }
});
$('relayCopy').addEventListener('click', async () => {
  if (!pendingRelay) return notify('Start or restore a relay first.');
  try {
    const reply = await currentRelayReply($('relayReply').value);
    await navigator.clipboard.writeText(relayReturnText(pendingRelay, reply));
    notify('Return package copied. Paste it into any local tool.');
  } catch(error) {
    notify(error.message || 'Cannot copy the return package.');
  }
});
$('relayReturn').addEventListener('click', async () => {
  if (!pendingRelay) return notify('Start or restore a relay first.');
  let reply;
  try {
    reply = await currentRelayReply($('relayReply').value);
    relayReturnPayload(pendingRelay, reply);
  } catch(error) {
    return notify(error.message || 'Select or paste a reply first.');
  }
  if (!await requestNative()) return notify('Native permission not granted. Use Copy return package instead.');
  $('relayReturn').disabled = true;
  try {
    const received = await bridgeMessage({type:'RELAY_RETURN',pending:pendingRelay,reply});
    if (!received?.ok) {
      return notify(`Return was not confirmed (${received?.code || received?.error || 'unknown'}). Check the local inbox before retrying; Copy is available.`);
    }
    if (received.result?.stored !== true || received.result?.status !== 'received') {
      return notify('The local provider did not confirm storage. Do not assume task completion.');
    }
    notify(`Reply stored locally as ${received.result.task_id}. No code or MCP tool was executed.`);
  } catch {
    notify('Return status unknown. Inspect the local inbox before trying again.');
  } finally {
    $('relayReturn').disabled = false;
  }
});
$('relayClear').addEventListener('click', async () => {
  await chrome.storage.local.remove('pendingRelay');
  pendingRelay = null;
  $('relayReply').value = '';
  describePending();
  notify('Local relay link cleared. Provider inbox items are unaffected.');
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
    aiEnabled = false;
    toolsEnabled = false;
    $('siteTools').textContent = "Enable this site's local MCP status";
    $('siteAi').textContent = 'Enable this site\'s enterprise AI → local Pi';
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
$('siteAi').addEventListener('click', async () => {
  if (!origin) return;
  const next = !aiEnabled;
  if (next && !enabled) {
    return notify('Allow this site first. Basic site permission stays read-only.');
  }
  if (next && !await requestNative()) {
    return notify('Native Messaging permission is needed for enterprise Pi tasks.');
  }
  const reply = await bridgeMessage({type:'SITE_AI_TOGGLE',origin,enabled:next});
  if (!reply?.ok) {
    return notify(`Enterprise AI permission unchanged (${reply?.code || 'unknown'}).`);
  }
  aiEnabled = next;
  $('siteAi').textContent = next
    ? 'Disable this site\'s enterprise AI'
    : 'Enable this site\'s enterprise AI → local Pi';
  notify(next
    ? 'This site may call Pi with its own authenticated enterprise AI ticket. No local file tools.'
    : 'Local enterprise AI permission revoked for this site.');
});
$('siteTools').addEventListener('click', async () => {
  if (!origin) return;
  const next = !toolsEnabled;
  if (next && !enabled) return notify('Allow this site first.');
  if (next && !await requestNative())
    return notify('Native Messaging permission is required for local MCP status.');
  const reply = await bridgeMessage({type:'SITE_TOOLS_TOGGLE',origin,enabled:next});
  if (!reply?.ok) return notify('Local MCP permission not changed (' + (reply?.code || 'unknown') + ').');
  toolsEnabled = next;
  $('siteTools').textContent = next
    ? "Disable this site's local MCP status"
    : "Enable this site's local MCP status";
  notify(next ? 'Status-only MCP is allowed for this site; local tool grants are still required.'
    : 'Local MCP website permission revoked.');
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
  describePending();
  try {
    const [host, relay] = await Promise.all([
      bridgeMessage({ type: 'HOST_GET' }),
      chrome.storage.local.get('pendingRelay'),
      refreshSite()
    ]);
    if (validateHostName(host?.host)) $('hostName').value = host.host;
    if (relay?.pendingRelay) {
      try {
        pendingRelay = validatePendingRelay(relay.pendingRelay);
        $('relayTaskRef').value = pendingRelay.task_ref;
        $('relayTarget').value = pendingRelay.web_ai;
      } catch { /* corrupted or obsolete local metadata is not trusted */ }
    }
    describePending();
  } catch { notify('Extension is not fully available. Try reopening the popup.'); }
})();
