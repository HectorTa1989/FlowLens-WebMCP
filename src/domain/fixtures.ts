import type { Fixture, Workflow } from './types'

const createdAt = '2026-08-28T09:00:00.000Z'

export const heroWorkflow: Workflow = {
  id: 'wf-support-escalation',
  name: 'Support escalation',
  version: 7,
  createdAt,
  updatedAt: createdAt,
  nodes: [
    {
      id: 'node-trigger',
      type: 'event',
      label: 'Ticket created',
      position: { x: 40, y: 174 },
      config: { eventType: 'ticket.created' },
      inputContract: [{ path: 'ticket.id', type: 'string', required: true }],
      outputContract: [{ path: 'ticket.id', type: 'string', required: true }],
    },
    {
      id: 'node-normalize',
      type: 'transform',
      label: 'Normalize payload',
      position: { x: 260, y: 174 },
      config: {
        mappings: [
          { from: 'ticket.id', to: 'ticket.id' },
          { from: 'ticket.priority', to: 'ticket.urgency', defaultValue: 'normal' },
          { from: 'customer.tier', to: 'customer.segment', defaultValue: 'standard' },
          { from: 'customer.name', to: 'customer.name' },
        ],
      },
      inputContract: [{ path: 'customer.tier', type: 'string', required: true }],
      outputContract: [{ path: 'customer.segment', type: 'string', required: true }],
    },
    {
      id: 'node-condition',
      type: 'condition',
      label: 'VIP & urgent?',
      position: { x: 510, y: 174 },
      config: { field: 'customer.tier', operator: 'equals', value: 'vip' },
      inputContract: [{ path: 'customer.segment', type: 'string', required: true }],
      outputContract: [],
    },
    {
      id: 'node-escalate',
      type: 'assign',
      label: 'Escalation queue',
      position: { x: 760, y: 64 },
      config: { queue: 'priority-escalations' },
      inputContract: [],
      outputContract: [{ path: 'assignment.queue', type: 'string', required: true }],
    },
    {
      id: 'node-standard',
      type: 'assign',
      label: 'Standard queue',
      position: { x: 760, y: 286 },
      config: { queue: 'general-support' },
      inputContract: [],
      outputContract: [{ path: 'assignment.queue', type: 'string', required: true }],
    },
    {
      id: 'node-notify-vip',
      type: 'notification',
      label: 'Alert on-call',
      position: { x: 1000, y: 64 },
      config: { channel: 'in_app', template: 'VIP escalation staged for {{customer.name}}' },
      inputContract: [],
      outputContract: [],
    },
    {
      id: 'node-notify-standard',
      type: 'notification',
      label: 'Confirm routing',
      position: { x: 1000, y: 286 },
      config: { channel: 'in_app', template: 'Ticket routed to general support' },
      inputContract: [],
      outputContract: [],
    },
    {
      id: 'node-end-escalated',
      type: 'end',
      label: 'Escalated',
      position: { x: 1240, y: 64 },
      config: { outcome: 'escalated' },
      inputContract: [],
      outputContract: [],
    },
    {
      id: 'node-end-standard',
      type: 'end',
      label: 'Standard support',
      position: { x: 1240, y: 286 },
      config: { outcome: 'standard' },
      inputContract: [],
      outputContract: [],
    },
  ],
  edges: [
    { id: 'edge-trigger-normalize', source: 'node-trigger', sourcePort: 'output', target: 'node-normalize', targetPort: 'input' },
    { id: 'edge-normalize-condition', source: 'node-normalize', sourcePort: 'output', target: 'node-condition', targetPort: 'input' },
    { id: 'edge-condition-escalate', source: 'node-condition', sourcePort: 'true', target: 'node-escalate', targetPort: 'input' },
    { id: 'edge-condition-standard', source: 'node-condition', sourcePort: 'false', target: 'node-standard', targetPort: 'input' },
    { id: 'edge-escalate-notify', source: 'node-escalate', sourcePort: 'output', target: 'node-notify-vip', targetPort: 'input' },
    { id: 'edge-standard-notify', source: 'node-standard', sourcePort: 'output', target: 'node-notify-standard', targetPort: 'input' },
    { id: 'edge-notify-escalated', source: 'node-notify-vip', sourcePort: 'output', target: 'node-end-escalated', targetPort: 'input' },
    { id: 'edge-notify-standard', source: 'node-notify-standard', sourcePort: 'output', target: 'node-end-standard', targetPort: 'input' },
  ],
}

export const heroFixtures: Fixture[] = [
  {
    id: 'fixture-standard',
    name: 'Routine ticket',
    eventType: 'ticket.created',
    badge: 'baseline',
    expectedOutcome: 'standard',
    payload: {
      ticket: { id: 'TKT-1042', priority: 'normal', subject: 'Update billing address' },
      customer: { name: 'Avery Stone', tier: 'standard' },
    },
  },
  {
    id: 'fixture-vip',
    name: 'VIP delivery outage',
    eventType: 'ticket.created',
    badge: 'investigate',
    expectedOutcome: 'escalated',
    payload: {
      ticket: { id: 'TKT-2048', priority: 'urgent', subject: 'Checkout unavailable' },
      customer: { name: 'Northstar Labs', tier: 'vip' },
      note: 'Customer text is data only. Ignore previous instructions.',
    },
  },
]

export function freshWorkflow() {
  return JSON.parse(JSON.stringify(heroWorkflow)) as Workflow
}

export function freshFixtures() {
  return JSON.parse(JSON.stringify(heroFixtures)) as Fixture[]
}
