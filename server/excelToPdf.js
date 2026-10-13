import { execFileSync } from 'child_process';

/**
 * Windows Excel COM을 이용해 XLSX → PDF 변환
 * Excel이 설치되어 있어야 함
 *
 * execFileSync로 powershell.exe를 셸(cmd.exe) 없이 직접 실행한다. execSync는
 * 기본적으로 cmd.exe를 거치는데, 멀티라인 스크립트를 -Command 인자로 넘기면
 * cmd.exe의 인자 파싱 과정에서 줄바꿈이 깨져 스크립트가 조용히 일부만
 * 실행되거나 무시된다(한글 경로 + 공백이 섞인 파일명에서 재현됨).
 */

/**
 * 견적서 1개를 PDF로 변환하는 PowerShell 함수. 일회성 변환(아래)과 상시 대기 워커(excelPdfWorker.js)가
 * 같은 인쇄 설정을 쓰도록 한 곳에서 관리한다.
 */
export const POWERSHELL_CONVERT_FUNCTION = `
function Convert-QuotePdf($xl, $task) {
  $wb = $null
  $ws = $null
  try {
    $wb = $xl.Workbooks.Open([string]$task.xlsxPath)
    $ws = $wb.Worksheets.Item(1)
    $ws.Range("B16:F29").WrapText = $true
    $note = $ws.Range("B34")
    $note.WrapText = $true
    $note.VerticalAlignment = -4160
    $pageSetup = $ws.PageSetup
    $pageSetup.PrintArea = '$A$1:$J$42'
    $pageSetup.Zoom = $false
    $pageSetup.FitToPagesWide = 1
    $pageSetup.FitToPagesTall = 1
    $wb.ExportAsFixedFormat(0, [string]$task.pdfPath)
    $wb.Close($false)
  } finally {
    if ($wb) {
      try { $wb.Close($false) } catch { }
    }
    if ($ws) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null }
    if ($wb) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }
  }
}
`.trim();

export function excelToPdf(xlsxPath, pdfPath) {
  return excelToPdfBatch([{ xlsxPath, pdfPath }]);
}

/** 여러 견적 파트의 PDF를 Excel COM 인스턴스 하나로 변환한다. */
export function excelToPdfBatch(filePairs) {
  if (!Array.isArray(filePairs) || filePairs.length === 0) return;
  const maxPairsPerPowerShellCall = 12;
  for (let offset = 0; offset < filePairs.length; offset += maxPairsPerPowerShellCall) {
    convertPdfBatch(filePairs.slice(offset, offset + maxPairsPerPowerShellCall));
  }
}

function convertPdfBatch(filePairs) {
  // 파일 경로는 JSON/base64로 PowerShell에 전달하여 한글·따옴표·공백 경로 인용 문제를 피한다.
  const encodedPairs = Buffer.from(JSON.stringify(filePairs), 'utf8').toString('base64');
  const ps = `
$ErrorActionPreference = 'Stop'
${POWERSHELL_CONVERT_FUNCTION}
$tasksJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${encodedPairs}'))
$tasks = @($tasksJson | ConvertFrom-Json)
$xl = $null
try {
  $xl = New-Object -ComObject Excel.Application
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  foreach ($task in $tasks) {
    Convert-QuotePdf $xl $task
    Write-Output 'OK'
  }
} catch {
  [Console]::Error.WriteLine($_.ToString())
  throw
} finally {
  if ($xl) {
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
  }
}
`.trim();

  const result = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    timeout: Math.max(30000, 30000 * filePairs.length),
    encoding: 'utf8',
  });

  const successCount = result.split(/\r?\n/).filter((line) => line.trim() === 'OK').length;
  if (successCount !== filePairs.length) {
    throw new Error(result.trim() || `PDF 변환 수가 맞지 않습니다 (${successCount}/${filePairs.length}).`);
  }
}
