import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { hostname, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const MALFORMED_LOCK_GRACE_MS = 30_000;

export function getAgentFolderFingerprint(agentFolder) {
  const resolved = resolve(String(agentFolder || ''));
  const canonical = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

export function getAgentLockDirectory(configuredDirectory = '') {
  const base = configuredDirectory
    || process.env.LOCALAPPDATA
    || process.env.TEMP
    || tmpdir();
  return resolve(configuredDirectory || join(base, 'CIMON', 'QuoteAgent', 'locks'));
}

export function getAgentLockPath(agentFolder, lockDirectory = '') {
  const directory = getAgentLockDirectory(lockDirectory);
  const fingerprint = getAgentFolderFingerprint(agentFolder);
  return join(directory, `agent-${fingerprint}.lock`);
}

export function readAgentLock(lockPath) {
  if (!existsSync(lockPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { malformed: true };
    return parsed;
  } catch {
    return { malformed: true };
  }
}

export function isSameHostProcessAlive(owner, localHost = hostname()) {
  if (!owner || owner.malformed) return false;
  if (owner.host && owner.host !== localHost) return true;
  const pid = Number(owner.pid);
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function lockIsStale(lockPath, owner, localHost) {
  if (!owner || owner.malformed) {
    try {
      return Date.now() - statSync(lockPath).mtimeMs > MALFORMED_LOCK_GRACE_MS;
    } catch {
      return true;
    }
  }
  if (owner.host && owner.host !== localHost) return false;
  return !isSameHostProcessAlive(owner, localHost);
}

function removeStaleLock(lockPath, localHost) {
  const quarantinePath = `${lockPath}.stale-${process.pid}-${randomUUID()}`;
  try {
    renameSync(lockPath, quarantinePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    return false;
  }

  const movedOwner = readAgentLock(quarantinePath);
  if (!lockIsStale(quarantinePath, movedOwner, localHost)) {
    // A concurrent process may have replaced the stale lock between our read and rename.
    // Put its active lock back rather than starting a second worker.
    try {
      if (!existsSync(lockPath)) renameSync(quarantinePath, lockPath);
    } catch {
      // Leave the quarantined metadata for diagnosis if another process won the race.
    }
    return false;
  }

  try { unlinkSync(quarantinePath); } catch { /* another cleanup may have removed it */ }
  return true;
}

/**
 * Acquire a machine-local lock keyed by the Drive-synced agent folder.
 * The lock file must live outside Google Drive so sync conflicts cannot duplicate ownership.
 */
export function acquireAgentInstanceLock({ agentFolder, lockDirectory = '', pid = process.pid, host = hostname() }) {
  const lockDir = getAgentLockDirectory(lockDirectory);
  const lockPath = getAgentLockPath(agentFolder, lockDir);
  const folderFingerprint = getAgentFolderFingerprint(agentFolder);
  mkdirSync(lockDir, { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const owner = {
      pid,
      host,
      instanceId: randomUUID(),
      agentFolderFingerprint: folderFingerprint,
      startedAt: new Date().toISOString(),
      executable: basename(process.execPath),
    };

    let descriptor;
    try {
      descriptor = openSync(lockPath, 'wx');
      writeFileSync(descriptor, JSON.stringify(owner), 'utf8');
      return {
        acquired: true,
        lockPath,
        owner,
        release() {
          const current = readAgentLock(lockPath);
          if (current?.instanceId !== owner.instanceId) return false;
          try {
            unlinkSync(lockPath);
            return true;
          } catch (error) {
            if (error?.code === 'ENOENT') return true;
            return false;
          }
        },
      };
    } catch (error) {
      if (descriptor !== undefined) {
        try { closeSync(descriptor); } catch { /* ignore */ }
        try { unlinkSync(lockPath); } catch { /* lock may have been replaced */ }
      }
      if (error?.code !== 'EEXIST') throw error;
    } finally {
      if (descriptor !== undefined) {
        try { closeSync(descriptor); } catch { /* already closed or close failed */ }
      }
    }

    const existingOwner = readAgentLock(lockPath);
    if (!lockIsStale(lockPath, existingOwner, host)) {
      return { acquired: false, lockPath, owner: existingOwner };
    }
    if (!removeStaleLock(lockPath, host)) {
      return { acquired: false, lockPath, owner: readAgentLock(lockPath) || existingOwner };
    }
  }

  return { acquired: false, lockPath, owner: readAgentLock(lockPath) };
}
