// Classify the official TAGO traingradename value for UI filtering.
// Keep the original train type in the result card. Never infer a train's service.
export function trainCategory(trainGrade) {
  const grade = String(trainGrade ?? '').normalize('NFC').toUpperCase().replace(/\s+/g, '');
  if (!grade) return '기타';
  if (grade.includes('KTX')) return 'KTX';
  if (grade.includes('SRT')) return 'SRT';
  if (/ITX|새마을|무궁화|누리로|통근/.test(grade)) return '일반';
  return '기타';
}

export function matchesTrainFilter(trainGrade, filter) {
  if (filter === '전체') return true;
  return trainCategory(trainGrade) === filter;
}