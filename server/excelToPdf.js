import { execFileSync } from 'child_process';

const psQuote = (s) => s.replace(/'/g, "''");

/**
 * Windows Excel COM을 이용해 XLSX → PDF 변환
 * Excel이 설치되어 있어야 함
 *
 * execFileSync로 powershell.exe를 셸(cmd.exe) 없이 직접 실행한다. execSync는
 * 기본적으로 cmd.exe를 거치는데, 멀티라인 스크립트를 -Command 인자로 넘기면
 * cmd.exe의 인자 파싱 과정에서 줄바꿈이 깨져 스크립트가 조용히 일부만
 * 실행되거나 무시된다(한글 경로 + 공백이 섞인 파일명에서 재현됨).
 */
export function excelToPdf(xlsxPath, pdfPath) {
  const ps = `
$ErrorActionPreference = 'Stop'
try {
  $xl = New-Object -ComObject Excel.Application
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Open('${psQuote(xlsxPath)}')
  $wb.ExportAsFixedFormat(0, '${psQuote(pdfPath)}')
  $wb.Close($false)
  Write-Output 'OK'
} catch {
  Write-Output "ERROR: $_"
} finally {
  if ($xl) {
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
  }
}
`.trim();

  const result = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], {
    timeout: 30000,
    encoding: 'utf8',
  });

  if (!result.includes('OK') || result.includes('ERROR')) {
    throw new Error(result.trim() || 'PDF 변환 스크립트가 예상된 출력을 반환하지 않았습니다.');
  }
}
