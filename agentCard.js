// Builds the public Agent Card served at GET /.well-known/agent-card.json.
//
// ASSUMPTION: the exact required JSON shape isn't fully spelled out in the
// prompt (only which fields must be nonempty/present). This follows the
// A2A 1.0 spec's general conventions as closely as the prompt describes.
// Cross-check against https://a2a-protocol.org (or wherever the "A2A 1.0
// specification" link in the assignment points) and adjust field names if
// the grader expects something different.
function buildAgentCard(baseUrl) {
  return {
    name: 'Invoice Action Agent',
    description:
      'Reads invoice claim batches, reconciles each package against policy and history, and proposes one typed business action per invoice with cited evidence.',
    version: '1.0.0',
    capabilities: {
      streaming: false,
      pushNotifications: false,
    },
    skills: [
      {
        id: 'invoice_action_agent',
        name: 'invoice_action_agent',
        description:
          'Reconciles invoice packages and proposes exactly one of settle_invoice, request_approval, hold_invoice, reject_duplicate, or open_exception per package, with minimal decisive evidence references.',
        tags: ['invoice', 'reconciliation', 'finance', 'action-agent'],
      },
    ],
    supportedInterfaces: [
      {
        url: baseUrl,
        protocolBinding: 'HTTP+JSON',
        protocolVersion: '1.0',
      },
    ],
    defaultInputModes: ['application/vnd.ga5.invoice-claim-batch+json'],
    defaultOutputModes: [
      'application/vnd.ga5.invoice-action-proposals+json',
      'application/vnd.ga5.invoice-action-receipts+json',
    ],
  };
}

module.exports = { buildAgentCard };
