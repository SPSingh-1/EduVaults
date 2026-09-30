/**
 * Central Class & Grade Formatting Utility for EduVault ERP
 * Strictly prevents duplicate "Class Class" or "Grade Grade" or "Section Section" text.
 */

export const formatGrade = (grade) => {
  if (!grade) return 'Unassigned';
  let g = String(grade).trim();

  // Strip duplicate leading "Class" or "Grade" repeatedly
  g = g.replace(/^(Class\s+|Grade\s+)+/gi, '').trim();

  // Pre-primary / Kindergarten levels
  const lower = g.toLowerCase();
  if (
    lower.startsWith('play') ||
    lower.startsWith('nur') ||
    lower.startsWith('lkg') ||
    lower.startsWith('ukg') ||
    lower.startsWith('kg')
  ) {
    return g;
  }

  // Prepend single "Class "
  return `Class ${g}`;
};

export const formatSection = (section) => {
  if (!section) return '';
  let s = String(section).trim();
  // Strip duplicate leading "Section" repeatedly
  s = s.replace(/^(Section\s+)+/gi, '').trim();
  return s;
};

export const getCleanGradeNumber = (grade) => {
  if (!grade) return '';
  let g = String(grade).trim();
  // Strip duplicate leading "Class" or "Grade" repeatedly
  return g.replace(/^(Class\s+|Grade\s+)+/gi, '').trim();
};

export const formatClassLabel = (grade, section, room = null, enrolled = null, capacity = null) => {
  const cleanG = formatGrade(grade);
  const cleanS = formatSection(section);
  let label = cleanS ? `${cleanG} - Section ${cleanS}` : cleanG;
  if (room) {
    const cleanR = String(room).trim().replace(/^(Room\s+)+/gi, '').trim();
    if (cleanR) {
      label += ` (Room ${cleanR})`;
    }
  }
  if (enrolled !== null && capacity !== null) {
    label += ` [${enrolled}/${capacity}]`;
  }
  return label;
};

export const getGradeSortIndex = (grade) => {
  if (!grade) return 999;
  const g = String(grade).toLowerCase().trim().replace(/^(class\s+|grade\s+)+/gi, '').trim();
  if (g.includes('play') || g === 'pg') return 1;
  if (g.includes('nur') || g === 'nursery') return 2;
  if (g.includes('lkg') || g.includes('lower kg') || g.includes('jr') || g.includes('junior')) return 3;
  if (g.includes('ukg') || g.includes('upper kg') || g.includes('sr') || g.includes('senior')) return 4;
  if (g.includes('kg') || g.includes('kindergarten')) return 5;
  const num = parseInt(g, 10);
  if (!isNaN(num)) return 10 + num;
  return 100;
};

export const sortClasses = (classesList) => {
  if (!Array.isArray(classesList)) return [];
  return [...classesList].sort((a, b) => {
    const gradeA = a?.grade || a?.Grade || a?.name || a?.Name || a?.class || a || '';
    const gradeB = b?.grade || b?.Grade || b?.name || b?.Name || b?.class || b || '';
    const idxA = getGradeSortIndex(gradeA);
    const idxB = getGradeSortIndex(gradeB);
    if (idxA !== idxB) return idxA - idxB;

    const secA = String(a?.section || a?.Section || '').trim().toUpperCase();
    const secB = String(b?.section || b?.Section || '').trim().toUpperCase();
    return secA.localeCompare(secB);
  });
};

export const sortGrades = (gradesList) => {
  if (!Array.isArray(gradesList)) return [];
  return [...gradesList].sort((a, b) => {
    const nameA = a?.name || a?.grade || a || '';
    const nameB = b?.name || b?.grade || b || '';
    const idxA = getGradeSortIndex(nameA);
    const idxB = getGradeSortIndex(nameB);
    if (idxA !== idxB) return idxA - idxB;
    return String(nameA).localeCompare(String(nameB));
  });
};

export default {
  formatGrade,
  formatSection,
  formatClassLabel,
  getCleanGradeNumber,
  getGradeSortIndex,
  sortClasses,
  sortGrades
};
