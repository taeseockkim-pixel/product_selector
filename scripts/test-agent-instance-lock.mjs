import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acquireAgentInstanceLock,
  getAgentFolderFingerprint,
  getAgentLockPath,
  readAgentLock,
} from '../agent/instanceLock.js';

const tempRoot = join(process.env.LOCALAPPDATA || tmpdir(), 'Temp', 'opencode');
await mkdir(tempRoot, { recursive: true });
const tempDir = await mkdtemp(join(tempRoot, 'agent-instance-lock-'));

try {
  const agentFolder = join(tempDir, '견적에이전트');
  const lockDirectory = join(tempDir, 'locks');
  const first = acquireAgentInstanceLock({ agentFolder, lockDirectory });
  assert.equal(first.acquired, true, '첫 인스턴스는 잠금을 획득해야 합니다.');

  const duplicate = acquireAgentInstanceLock({ agentFolder, lockDirectory });
  assert.equal(duplicate.acquired, false, '같은 Drive 대기 폴더의 두 번째 인스턴스는 차단해야 합니다.');
  assert.equal(duplicate.owner.instanceId, first.owner.instanceId, '중복 실행은 기존 소유자 정보를 보존해야 합니다.');
  assert.equal(readAgentLock(first.lockPath).instanceId, first.owner.instanceId);

  const otherFolder = acquireAgentInstanceLock({ agentFolder: join(tempDir, '다른-견적에이전트'), lockDirectory });
  assert.equal(otherFolder.acquired, true, '별도 대기 폴더는 독립적으로 실행할 수 있어야 합니다.');
  otherFolder.release();

  assert.equal(first.release(), true, '잠금 소유자는 자기 잠금을 해제할 수 있어야 합니다.');
  const restarted = acquireAgentInstanceLock({ agentFolder, lockDirectory });
  assert.equal(restarted.acquired, true, '정상 종료 후 새 인스턴스가 잠금을 얻어야 합니다.');
  restarted.release();

  const staleLockPath = getAgentLockPath(agentFolder, lockDirectory);
  await writeFile(staleLockPath, JSON.stringify({
    pid: 2_147_483_647,
    host: hostname(),
    instanceId: 'dead-process-lock',
    startedAt: new Date(0).toISOString(),
    agentFolderFingerprint: getAgentFolderFingerprint(agentFolder),
  }), 'utf8');
  const afterCrash = acquireAgentInstanceLock({ agentFolder, lockDirectory });
  assert.equal(afterCrash.acquired, true, '종료된 PID의 stale lock은 안전하게 회수해야 합니다.');
  assert.notEqual(JSON.parse(await readFile(staleLockPath, 'utf8')).instanceId, 'dead-process-lock');
  afterCrash.release();

  console.log('✅ 에이전트 단일 실행 잠금·stale PID 회수 검증 통과');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
