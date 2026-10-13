import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsScript = readFileSync(join(root, 'APPS_SCRIPT_Code_gs_전체교체코드.txt'), 'utf8');

function makeHarness({ email, rows }) {
  const columnCount = Math.max(...rows.map((row) => row.length));
  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => columnCount,
    getRange: (startRow, startColumn, rowCount, requestedColumnCount) => ({
      getValues: () => rows
        .slice(startRow - 1, startRow - 1 + rowCount)
        .map((row) => row.slice(startColumn - 1, startColumn - 1 + requestedColumnCount)),
    }),
  };
  const spreadsheet = {
    getSheetByName: () => sheet,
    getSheets: () => [sheet],
  };

  const load = new Function(
    'DriveApp',
    'SpreadsheetApp',
    'Session',
    'Logger',
    'CacheService',
    `${appsScript}\nreturn {
      CONFIG,
      getAuthorizedUserFromReact,
      getQuoteLedgerFromReact,
      installTestOverrides(overrides) {
        if (overrides.processAgentResults) processAgentResults = overrides.processAgentResults;
        if (overrides.getAvailableLedgerYears) getAvailableLedgerYears_ = overrides.getAvailableLedgerYears;
        if (overrides.getExistingYearSystem) getExistingYearSystem_ = overrides.getExistingYearSystem;
        if (overrides.getAgentSubfolder) getAgentSubfolder_ = overrides.getAgentSubfolder;
        if (overrides.commitLedgerAfterAgentSuccess) commitLedgerAfterAgentSuccess_ = overrides.commitLedgerAfterAgentSuccess;
        if (overrides.updateLedgerLink) updateLedgerLink_ = overrides.updateLedgerLink;
        if (overrides.exportLedgerToAgent) exportLedgerToAgent_ = overrides.exportLedgerToAgent;
        if (overrides.setQuoteOperationStatus) setQuoteOperationStatus_ = overrides.setQuoteOperationStatus;
        if (overrides.permanentlyDeleteFile) permanentlyDeleteFile_ = overrides.permanentlyDeleteFile;
        if (overrides.finalizePendingQuoteDrafts) finalizePendingQuoteDraftsForUser_ = overrides.finalizePendingQuoteDrafts;
      }
    };`,
  );

  const api = load(
    {},
    { openById: () => spreadsheet },
    { getActiveUser: () => ({ getEmail: () => email }) },
    { log: () => {} },
    // 작성자 DB 캐시는 시험마다 새로 읽도록 항상 비어 있는 캐시를 쓴다.
    { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
  );
  api.installTestOverrides({ finalizePendingQuoteDrafts: () => {} });
  api.CONFIG.AUTHOR_DB_SHEET_ID = 'mock-author-db';
  api.CONFIG.AUTHOR_DB_SHEET_NAME = '시트1';
  api.CONFIG.DEFAULT_DEPARTMENT = '기술영업';
  api.CONFIG.DEPARTMENT_ROOTS = {
    기술영업: 'folder-tech',
    영업: 'folder-sales',
    프로젝트: 'folder-project',
  };
  api.CONFIG.ADMIN_EMAILS = ['admin@cimon.com'];
  return api;
}

const currentYear = new Date().getFullYear();

// 영문 헤더와 이름 <email> 형식, 부서 공백/별칭을 정상화하고 본인 부서만 반환한다.
{
  const api = makeHarness({
    email: 'user@cimon.com',
    rows: [
      ['Author Name', 'Mobile', 'User Email', 'Department'],
      ['홍길동', '010-0000-0000', '홍길동 <User@CIMON.com>', '자동화 영업실'],
    ],
  });
  const access = api.getAuthorizedUserFromReact();
  assert.equal(access.authorized, true);
  assert.equal(access.author.email, 'user@cimon.com');
  assert.equal(access.author.department, '영업');
  assert.deepEqual(access.availableDepartments, ['영업']);

  const queueCalls = [];
  const ledgerCalls = [];
  api.installTestOverrides({
    processAgentResults: (limit, department) => queueCalls.push({ limit, department }),
    getAvailableLedgerYears: (rootFolderId) => {
      ledgerCalls.push({ type: 'years', rootFolderId });
      return [currentYear];
    },
    getExistingYearSystem: (_year, rootFolderId) => {
      ledgerCalls.push({ type: 'ledger', rootFolderId });
      return null;
    },
  });

  // 요청으로 다른 부서를 보내더라도 일반 계정은 서버에서 자기 부서로 고정된다.
  const result = api.getQuoteLedgerFromReact(currentYear, '프로젝트');
  assert.equal(result.success, true);
  assert.equal(result.department, '영업');
  assert.deepEqual(result.availableDepartments, ['영업']);
  assert.deepEqual(queueCalls, [{ limit: 2, department: '영업' }]);
  assert.ok(ledgerCalls.every((call) => call.rootFolderId === 'folder-sales'));
}

// 관리자만 다른 부서 목록을 선택할 수 있다.
{
  const api = makeHarness({
    email: 'admin@cimon.com',
    rows: [
      ['작성자', '연락처', '이메일', '부서'],
      ['관리자', '', 'ADMIN@cimon.com', '기술영업실'],
    ],
  });
  api.installTestOverrides({
    processAgentResults: () => {},
    getAvailableLedgerYears: () => [currentYear],
    getExistingYearSystem: () => null,
  });
  const result = api.getQuoteLedgerFromReact(currentYear, '프로젝트');
  assert.equal(result.success, true);
  assert.equal(result.isAdmin, true);
  assert.equal(result.department, '프로젝트');
  assert.deepEqual(result.availableDepartments, ['기술영업', '영업', '프로젝트']);
}

// 미지원 부서와 다중 부서 이메일은 거부하고, 거부된 요청은 큐 처리도 실행하지 않는다.
for (const rows of [
  [
    ['작성자', '연락처', '이메일', '부서'],
    ['사용자', '', 'user@cimon.com', '마케팅'],
  ],
  [
    ['작성자', '연락처', '이메일', '부서'],
    ['사용자 A', '', 'user@cimon.com', '기술영업'],
    ['사용자 B', '', 'USER@CIMON.COM', '영업'],
  ],
]) {
  const api = makeHarness({ email: 'user@cimon.com', rows });
  let queueCalls = 0;
  api.installTestOverrides({ processAgentResults: () => { queueCalls++; } });
  const result = api.getAuthorizedUserFromReact();
  assert.equal(result.authorized, false);
  assert.ok(result.message);
  assert.equal(api.getQuoteLedgerFromReact(currentYear, '프로젝트').success, false);
  assert.equal(queueCalls, 0);
}

// 사용자 요청으로 결과 큐를 확인할 때 다른 부서의 완료 보고는 처리하거나 삭제하지 않는다.
{
  const api = makeHarness({
    email: 'user@cimon.com',
    rows: [
      ['작성자', '연락처', '이메일', '부서'],
      ['사용자', '', 'user@cimon.com', '영업'],
    ],
  });
  const removed = [];
  const files = [
    {
      id: 'project-result',
      result: { ok: true, department: '프로젝트', quoteNumber: '프로젝트 2610-001', fileUrl: 'https://example.test/project.pdf' },
    },
    {
      id: 'sales-result',
      result: { ok: true, department: '영업', quoteNumber: '영업 2610-001', fileUrl: 'https://example.test/sales.pdf', year: currentYear, details: { operationId: 'sales-operation' } },
    },
  ].map(({ id, result }) => ({
    getId: () => id,
    getName: () => `${id}.json`,
    getBlob: () => ({ getDataAsString: () => JSON.stringify(result) }),
  }));
  let index = 0;
  api.installTestOverrides({
    getAgentSubfolder: () => ({ getFiles: () => ({ hasNext: () => index < files.length, next: () => files[index++] }) }),
    getAvailableLedgerYears: () => [currentYear],
    getExistingYearSystem: () => null,
    commitLedgerAfterAgentSuccess: () => ({}),
    updateLedgerLink: () => {},
    exportLedgerToAgent: () => {},
    setQuoteOperationStatus: () => {},
    permanentlyDeleteFile: (id) => removed.push(id),
  });

  // Invoke the real Apps Script helper through the list call; two files are scanned, but only sales is processed.
  const result = api.getQuoteLedgerFromReact(currentYear, '프로젝트');
  assert.equal(result.success, true);
  assert.deepEqual(removed, ['sales-result']);
}

console.log('✅ 견적 목록의 이메일·부서 권한 검증 통과');
