/**
 * Agent liveness from last heartbeat.
 * CLI default interval: 15 minutes. Stale after 2× interval (30 min)
 * so one missed beat marks the agent down.
 */
const HEARTBEAT_INTERVAL_SECONDS = Number(process.env.AGENT_HEARTBEAT_INTERVAL_SECONDS) || 900;
const HEARTBEAT_STALE_SECONDS =
  Number(process.env.AGENT_HEARTBEAT_STALE_SECONDS) || HEARTBEAT_INTERVAL_SECONDS * 2;

function agentStatusFromHeartbeat(lastHeartbeatAt, now = Date.now()) {
  if (!lastHeartbeatAt) return 'unknown';
  const ts = new Date(lastHeartbeatAt).getTime();
  if (!Number.isFinite(ts)) return 'unknown';
  if (now - ts <= HEARTBEAT_STALE_SECONDS * 1000) return 'live';
  return 'down';
}

function summarizeAgentStatus(servers, now = Date.now()) {
  let live = 0;
  let down = 0;
  let unknown = 0;
  for (const s of servers) {
    const status = agentStatusFromHeartbeat(s.agent_last_heartbeat_at, now);
    if (status === 'live') live += 1;
    else if (status === 'down') down += 1;
    else unknown += 1;
  }
  return {
    agents_live: live,
    agents_down: down,
    agents_unknown: unknown,
    agents_total: servers.length,
    heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS,
    heartbeat_stale_seconds: HEARTBEAT_STALE_SECONDS
  };
}

module.exports = {
  HEARTBEAT_INTERVAL_SECONDS,
  HEARTBEAT_STALE_SECONDS,
  agentStatusFromHeartbeat,
  summarizeAgentStatus
};
