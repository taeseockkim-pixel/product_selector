import { execSync } from 'child_process';

/**
 * Windows Excel COM을 이용해 XLSX → PDF 변환
 * Excel이 설치되어 있어야 함
 */
export function excelToPdf(xlsxPath, pdfPath) {
  const ps = `
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open('${xlsxPath.replace(/\\/g, '\\\\')}')
  $wb.ExportAsFixedFormat(0, '${pdfPath.replace(/\\/g, '\\\\')}')
  $wb.Close($false)
  Write-Host 'OK'
} catch {
  Write-Host "ERROR: $_"
} finally {
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
`.trim();

  const result = execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, {
    timeout: 30000,
    encoding: 'utf8',
  });

  if (result.includes('ERROR')) {
    throw new Error(result.trim());
  }
}
