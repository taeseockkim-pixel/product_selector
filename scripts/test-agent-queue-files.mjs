import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  draftAttachmentFileName,
  draftManifestFileName,
  isSafeOperationId,
  publishDraftAttachments,
  writeHeartbeatFile,
  writeStoppedHeartbeatFile,
} from '../agent/queueFiles.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = join(process.env.LOCALAPPDATA || 'C:/Users/CIMON/AppData/Local', 'Temp', 'opencode');
await mkdir(tempRoot, { recursive: true });
const tempDir = await mkdtemp(join(tempRoot, 'agent-queue-files-'));

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

try {
  const operationId = '123e4567-e89b-12d3-a456-426614174000';
  const attachmentsDir = join(tempDir, 'attachments');
  const pdfA = join(tempDir, '기술영업 2610-500_고객_견적서_1.pdf');
  const pdfB = join(tempDir, '기술영업 2610-500_고객_견적서_2.pdf');
  await writeFile(pdfA, Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2048, 7), Buffer.from('\n%%EOF')]));
  await writeFile(pdfB, Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(4096, 9), Buffer.from('\n%%EOF')]));

  // 1. 분할 견적의 PDF가 모두 같은 내용·같은 이름으로 복사되고 manifest가 기록된다.
  const manifest = publishDraftAttachments({ attachmentsDir, operationId, pdfPaths: [pdfA, pdfB] });
  assert.equal(manifest.ok, true);
  assert.equal(manifest.files.length, 2);
  assert.deepEqual(manifest.files.map((file) => file.name), [
    '기술영업 2610-500_고객_견적서_1.pdf',
    '기술영업 2610-500_고객_견적서_2.pdf',
  ]);
  for (const [index, source] of [pdfA, pdfB].entries()) {
    const entry = manifest.files[index];
    assert.equal(entry.attachmentName, draftAttachmentFileName(operationId, index + 1, entry.name));
    assert.equal(await sha256(join(attachmentsDir, entry.attachmentName)), await sha256(source), '복사본은 저장 PDF와 바이트가 같아야 합니다.');
    assert.equal((await stat(join(attachmentsDir, entry.attachmentName))).size, entry.size);
  }
  const written = JSON.parse(await readFile(join(attachmentsDir, draftManifestFileName(operationId)), 'utf8'));
  assert.equal(written.ok, true);
  assert.equal(written.files.length, 2);
  assert.ok((await readdir(attachmentsDir)).includes(draftManifestFileName(operationId)));

  // 2. 원본 PDF가 없으면 오류 manifest만 남기고 부분 복사본은 첨부 대상으로 노출하지 않는다(ok:false).
  const failedId = '223e4567-e89b-12d3-a456-426614174111';
  const failed = publishDraftAttachments({ attachmentsDir, operationId: failedId, pdfPaths: [pdfA, join(tempDir, '없는파일.pdf')] });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /ENOENT|없|no such file/i);
  assert.deepEqual(failed.files, []);
  const failedManifest = JSON.parse(await readFile(join(attachmentsDir, draftManifestFileName(failedId)), 'utf8'));
  assert.equal(failedManifest.ok, false);

  // 3. 경로 조작이 가능한 작업 ID는 거부한다.
  for (const badId of ['', '../evil', 'a/b', 'short', 'x'.repeat(80)]) {
    assert.equal(isSafeOperationId(badId), false, `허용하면 안 되는 ID: ${badId}`);
    assert.throws(() => publishDraftAttachments({ attachmentsDir, operationId: badId, pdfPaths: [pdfA] }));
  }
  assert.equal(isSafeOperationId(operationId), true);

  // 4. 생존 신호와 정지 신호.
  const heartbeatPath = join(tempDir, 'heartbeat.json');
  writeHeartbeatFile(heartbeatPath, { version: 'test', features: ['draftAttachments'], host: 'PC' });
  const alive = JSON.parse(await readFile(heartbeatPath, 'utf8'));
  assert.equal(alive.stopped, false);
  assert.deepEqual(alive.features, ['draftAttachments']);
  assert.ok(Math.abs(Date.now() - alive.ts) < 5000);
  writeStoppedHeartbeatFile(heartbeatPath, { version: 'test', features: ['draftAttachments'], host: 'PC' });
  assert.equal(JSON.parse(await readFile(heartbeatPath, 'utf8')).stopped, true);

  // 5. 에이전트 소스가 새 흐름을 실제로 연결하고 있는지 확인한다.
  const agentSource = await readFile(join(root, 'agent', 'index.js'), 'utf8');
  assert.match(agentSource, /publishDraftAttachments\(/, '에이전트가 첨부 PDF를 전달해야 합니다.');
  assert.match(agentSource, /payload\.attachPdf/, '새 Apps Script가 요청한 경우에만 첨부를 복사해야 합니다.');
  assert.match(agentSource, /startHeartbeat\(\);/, '에이전트가 생존 신호를 보내야 합니다.');
  assert.match(agentSource, /app\.get\('\/health'/, '/health 엔드포인트가 있어야 합니다.');
  assert.match(agentSource, /heartbeatStarted/, '중복 실행 프로세스가 정지 신호를 덮어쓰지 않아야 합니다.');
  assert.match(agentSource, /processedMarkerPath\(/, '성공 처리한 작업을 operationId로 표시해야 합니다.');
  assert.match(agentSource, /markJobProcessed\(/, '성공 처리 후 표시를 기록해야 합니다.');
  assert.match(agentSource, /이미 처리된 작업 건너뜀/, '재동기화된 pending은 재처리하지 않아야 합니다.');

  console.log('✅ 에이전트 첨부 PDF·생존 신호 파일 처리 검증 통과');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
