import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

/** Apps Script와 약속한 attachments 폴더 파일명 규칙 */
export function draftAttachmentFileName(operationId, index, pdfName) {
  return `${operationId}__${index}__${pdfName}`;
}

export function draftManifestFileName(operationId) {
  return `${operationId}__manifest.json`;
}

/** 경로 조작을 막기 위해 Apps Script의 UUID 형식만 허용한다. */
export function isSafeOperationId(operationId) {
  return /^[A-Za-z0-9-]{8,64}$/.test(String(operationId || ''));
}

/**
 * 저장된 최종 PDF를 Drive 동기화 폴더(attachments)에 복사하고, 마지막에 manifest를 쓴다.
 * Apps Script는 manifest가 보이고 모든 파일 크기가 일치할 때만 첨부하므로,
 * 동기화 중인 반쪽 파일이 고객 메일에 첨부되지 않는다.
 */
export function publishDraftAttachments({ attachmentsDir, operationId, pdfPaths }) {
  if (!isSafeOperationId(operationId)) {
    throw new Error(`메일 첨부용 작업 ID 형식이 올바르지 않습니다: ${operationId}`);
  }
  mkdirSync(attachmentsDir, { recursive: true });

  const files = [];
  let failure = null;
  try {
    pdfPaths.forEach((pdfPath, index) => {
      const name = basename(pdfPath);
      const attachmentName = draftAttachmentFileName(operationId, index + 1, name);
      const target = join(attachmentsDir, attachmentName);
      copyFileSync(pdfPath, target);
      const sourceSize = statSync(pdfPath).size;
      const targetSize = statSync(target).size;
      if (sourceSize <= 0 || sourceSize !== targetSize) {
        throw new Error(`첨부 PDF 복사 검증에 실패했습니다: ${name}`);
      }
      files.push({ index: index + 1, name, attachmentName, size: targetSize });
    });
  } catch (err) {
    failure = err;
  }

  const manifest = failure
    ? { operationId, ok: false, error: String(failure.message || failure), files: [], createdAt: Date.now() }
    : { operationId, ok: true, files, createdAt: Date.now() };
  writeFileSync(join(attachmentsDir, draftManifestFileName(operationId)), JSON.stringify(manifest), 'utf8');
  return manifest;
}

/** 에이전트 생존 신호. Apps Script는 파일의 수정 시각(구글 서버 시계)으로 최신 여부를 판단한다. */
export function writeHeartbeatFile(heartbeatPath, info) {
  writeFileSync(heartbeatPath, JSON.stringify({
    ts: Date.now(),
    iso: new Date().toISOString(),
    stopped: false,
    ...info,
  }), 'utf8');
}

export function writeStoppedHeartbeatFile(heartbeatPath, info) {
  writeFileSync(heartbeatPath, JSON.stringify({
    ts: Date.now(),
    iso: new Date().toISOString(),
    stopped: true,
    ...info,
  }), 'utf8');
}
