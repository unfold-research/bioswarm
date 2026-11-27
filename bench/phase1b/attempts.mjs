// These reason codes describe the cause recorded by the operator, independently of the delivery score.
const operational = new Set(['host_preflight', 'host_disk', 'wrong_account', 'wrong_model', 'wrong_effort',
  'network', 'provider_5xx', 'provider_429', 'subscription_quota']);

export function isOperational(record) {
  if (record.comparable !== false) return false;
  return operational.has(record.incident ?? (record.end === 'disk' ? 'host_disk' : null));
}
export function isIntegrityFailure(record) {
  return record.incident === 'policy_mismatch' || record.policyReceived === false;
}

export function requireDispatch(records, index) {
  if (records.some(isIntegrityFailure)) throw Error('Treatment integrity failed. Suspend the entire sample for investigation.');
  const previous = records.filter((r) => r.index === index);
  if (previous.length === 0 || (previous.length === 1 && isOperational(previous[0]))) return;
  throw Error('This attempt already ran. Only one retry for a classified operational incident is allowed.');
}

export function comparableAttempt(attempts) {
  if (attempts.length === 1 && attempts[0].comparable === true) return attempts[0];
  if (attempts.length === 2 && isOperational(attempts[0]) && attempts[1].comparable === true &&
      attempts[0].run && attempts[1].run && attempts[0].run !== attempts[1].run) return attempts[1];
  return null;
}
