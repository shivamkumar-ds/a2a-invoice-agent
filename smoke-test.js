const BASE = process.env.BASE_URL || 'http://localhost:3000/a2a';
const TOKEN = 'test-user-1';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/a2a+json',
      'A2A-Version': '1.0',
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? {} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  console.log('--- agent card (no auth needed) ---');
  const cardRes = await fetch(BASE.replace('/a2a', '') + '/.well-known/agent-card.json');
  console.log(cardRes.status, JSON.stringify(await cardRes.json(), null, 2).slice(0, 500));

  console.log('\n--- missing auth (expect 401) ---');
  const noAuth = await fetch(BASE + '/tasks', { headers: { 'A2A-Version': '1.0' } });
  console.log(noAuth.status);

  const batchMessage = {
    message: {
      messageId: 'msg-1',
      role: 'ROLE_USER',
      parts: [
        {
          mediaType: 'application/vnd.ga5.invoice-claim-batch+json',
          data: {
            batchId: 'batch-1',
            policyRevision: 'rev-1',
            packages: [
              { packageId: 'pkg-1', vendorName: 'Acme', invoiceNumber: 'INV-1', amountMinor: 10000, currency: 'INR', text: 'straightforward valid invoice' },
              { packageId: 'pkg-2', vendorName: 'Beta', invoiceNumber: 'INV-2', amountMinor: 500000, currency: 'INR', text: 'this invoice was already paid, duplicate submission' },
            ],
          },
        },
      ],
    },
    configuration: { returnImmediately: false, historyLength: 20 },
  };

  console.log('\n--- message:send (initial batch) ---');
  const first = await call('POST', '/message:send', batchMessage);
  console.log(JSON.stringify(first, null, 2));

  console.log('\n--- message:send (exact replay, same messageId+content) ---');
  const replay = await call('POST', '/message:send', batchMessage);
  console.log('replay matches:', JSON.stringify(replay.json) === JSON.stringify(first.json));

  console.log('\n--- message:send (same messageId, different content -> expect 409) ---');
  const conflictMsg = JSON.parse(JSON.stringify(batchMessage));
  conflictMsg.message.parts[0].data.packages[0].amountMinor = 99999;
  const conflict = await call('POST', '/message:send', conflictMsg);
  console.log('status:', conflict.status, conflict.json);

  const taskId = first.json.task.id;
  const contextId = first.json.task.contextId;
  const proposals = first.json.task.artifacts[0].parts[0].data.proposals;

  console.log('\n--- GET /tasks/:id ---');
  const getTask = await call('GET', `/tasks/${taskId}`);
  console.log(getTask.status, getTask.json.task.status);

  console.log('\n--- GET /tasks (list) ---');
  const listTasks = await call('GET', '/tasks');
  console.log(listTasks.status, listTasks.json.tasks.length);

  console.log('\n--- cross-user isolation: different token should not see this task ---');
  const otherRes = await fetch(BASE + `/tasks/${taskId}`, {
    headers: { 'A2A-Version': '1.0', Authorization: 'Bearer other-user' },
  });
  console.log(otherRes.status);

  console.log('\n--- result continuation (accept all) ---');
  const resultsMessage = {
    message: {
      messageId: 'msg-2',
      taskId,
      contextId,
      role: 'ROLE_USER',
      parts: [
        {
          mediaType: 'application/vnd.ga5.invoice-action-results+json',
          data: {
            batchId: 'batch-1',
            results: proposals.map((p) => ({
              packageId: p.packageId,
              actionId: p.actionId,
              action: p.action,
              outcome: 'ACCEPTED',
              receiptNonce: 'nonce-' + p.actionId,
            })),
          },
        },
      ],
    },
  };
  const completed = await call('POST', '/message:send', resultsMessage);
  console.log(JSON.stringify(completed, null, 2));

  console.log('\n--- cancel an already-completed task (expect 409) ---');
  const cancelAfterDone = await call('POST', `/tasks/${taskId}:cancel`);
  console.log(cancelAfterDone.status, cancelAfterDone.json);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
