import type { Lang } from '../context/LangContext';

type T = { ko: string; en: string };
const t = (ko: string, en: string): T => ({ ko, en });

export const UI = {
  productGuide:   t('제품 선택 가이드', 'Product Selection Guide'),
  subtitle:       t('요구사항에 맞는 최적의 CIMON 제품을 찾아드립니다', 'Find the best CIMON product for your requirements'),
  compare:        t('비교', 'Compare'),
  shortlist:      t('담기', 'Shortlist'),
  productType:    t('제품 타입', 'Product Type'),
  filters:        t('필터', 'Filters'),
  reset:          t('초기화', 'Reset'),
  series:         t('시리즈', 'Series'),
  colImage:       t('모델', 'Image'),
  colModelName:   t('모델명', 'Model'),
  colDesc:        t('설명', 'Description'),
  colSpecs:       t('사양', 'Specs'),
  colAdd:         t('담기', 'Add'),
  colCompare:     t('비교', 'Cmp.'),
  detailBtn:      t('상세', 'Detail'),
  noProducts:     t('조건에 맞는 제품이 없습니다.\n필터 조건을 조정해 주세요.', 'No products match the criteria.\nAdjust the filter conditions.'),
  back:           t('뒤로', 'Back'),
  shortlistTitle: t('담은 제품 목록', 'Shortlisted Products'),
  clearList:      t('목록 비우기', 'Clear List'),
  emptyShortlist: t('담은 제품이 없습니다.', 'No products shortlisted.'),
  goToList:       t('제품 목록으로 돌아가기', 'Back to product list'),
  noSpecs:        t('사양 정보 없음', 'No spec data'),
  compareTitle:   t('제품 비교', 'Product Comparison'),
  clearCompare:   t('비교 목록 비우기', 'Clear Compare'),
  noCompare:      t('비교할 제품이 없습니다.', 'No products to compare.'),
  noCompareSpecs: t('비교할 사양 항목이 없습니다.', 'No spec items to compare.'),
  specCol:        t('사양', 'Spec'),
  diffLegend:     t('노란 행: 제품 간 사양 차이 있음', 'Yellow rows indicate differences between products'),
  catalog:        t('카탈로그', 'Catalog'),
  manual:         t('메뉴얼', 'Manual'),
  drawing:        t('도면', 'Drawing'),
  certification:  t('인증서', 'Certificate'),
  detailSpecs:    t('상세 사양', 'Specifications'),
  noDetailSpecs:  t('상세 사양 정보 없음 (카탈로그 검증 후 업데이트 예정)', 'Spec data unavailable (to be updated after catalog verification)'),
  openTab:        t('새 탭에서 열기', 'Open in new tab'),
  downloadFile:   t('다운로드', 'Download'),
  cancelAdd:      t('담기 취소', 'Remove'),
  addToCompare:   t('비교 추가', 'Add to compare'),
  removeCompare:  t('비교 해제', 'Remove from compare'),
  removeFromComp: t('비교에서 제거', 'Remove from comparison'),
  removeShortlist:t('목록에서 제거', 'Remove from shortlist'),
  detailSpecs2:   t('상세 사양', 'Specifications'),
  compareLimit:   t('비교는 최대 4개까지 가능합니다', 'Up to 4 products can be compared'),
  copyLink:       t('링크 복사', 'Copy Link'),
  linkCopied:     t('링크가 복사되었습니다!', 'Link copied!'),
  searchPlaceholder: t('모델명 또는 설명 검색...', 'Search model or description...'),
  searchNoResults: t('검색 결과가 없습니다.', 'No results found.'),
  printBtn:       t('인쇄', 'Print'),
  inquiryBtn:     t('견적 요청', 'Request Quote'),
  csvExport:      t('CSV 다운로드', 'Download CSV'),
  similarProducts: t('유사 제품', 'Similar Products'),
  filterBtn:      t('필터', 'Filters'),
  searchBtn:      t('검색', 'Search'),
} satisfies Record<string, T>;

export function totalLabel(n: number, lang: Lang): string {
  return lang === 'ko' ? `총 ${n}개` : `Total: ${n}`;
}

export function selectedLabel(n: number, lang: Lang): string {
  return lang === 'ko' ? `${n}개 선택됨` : `${n} selected`;
}

export function cartCountLabel(n: number, lang: Lang): string {
  return lang === 'ko' ? `${n}개` : `${n}`;
}
