import type { Course } from '../model/Course';
import type { Instructor } from '../model/Instructor';
import type { Schedule } from '../model/Schedule';

export const uniqueTermInstructors = (course: Course) => {
  const termInstructors = course.instructors.filter((i) =>
    course.terms.includes(i.term)
  );

  const unique = [];
  const filledTerms = new Set();

  for (const instructor of termInstructors) {
    if (!filledTerms.has(instructor.term)) {
      unique.push(instructor);
      filledTerms.add(instructor.term);
    }
  }

  const order = ['Fall', 'Winter', 'Summer'];

  for (const term of course.terms) {
    if (!filledTerms.has(term))
      unique.push({ term, name: 'No Instructor Assigned' });
  }

  unique.sort((a, b) => order.indexOf(a.term) - order.indexOf(b.term));

  return unique;
};

export const getCurrentTerms = (): [string, string, string] => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 8)
    return [`Fall ${year}`, `Winter ${year + 1}`, `Summer ${year + 1}`];

  return [`Fall ${year - 1}`, `Winter ${year}`, `Summer ${year}`];
};

export const filterCurrentInstructors = (instructors: Instructor[]) => {
  const currentTerm = getCurrentTerms();
  return instructors.filter((i) => currentTerm.includes(i.term));
};

export const sortTerms = (terms: string[]) => {
  const order = ['Summer', 'Fall', 'Winter'];

  return terms.sort((a, b) => {
    return a.split(' ')[1] === b.split(' ')[1]
      ? order.indexOf(a.split(' ')[0]) - order.indexOf(b.split(' ')[0])
      : parseInt(a.split(' ')[1], 10) - parseInt(b.split(' ')[1], 10);
  });
};

export const sortSchedulesByBlocks = (schedules: Schedule[]) => {
  const order = ['Lec', 'Lab', 'Seminar', 'Tut', 'Conf'];

  return schedules.sort((a, b) => {
    const aNum = parseInt(a.blocks[0].display.split(' ')[1], 10);
    const bNum = parseInt(b.blocks[0].display.split(' ')[1], 10);
    const aType = a.blocks[0].display.split(' ')[0];
    const bType = b.blocks[0].display.split(' ')[0];

    return aType === bType
      ? aNum - bNum
      : order.indexOf(aType) - order.indexOf(bType);
  });
};

export const getUrl = (): string => import.meta.env.VITE_API_URL ?? '';

export const getGoogleAPIKey = (): string =>
  import.meta.env.VITE_GOOGLE_API_KEY ?? '';

export const courseIdToUrlParam = (courseId: string) =>
  `${courseId.slice(0, 4)}-${courseId.slice(4)}`.toLowerCase();

export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

export const punctuate = (s: string): string =>
  s.charAt(s.length - 1) === '.' ? s : s + '.';

export const isValidCourseCode = (s: string) =>
  /^(([A-Z0-9]){4} [0-9]{3}(D1|D2|N1|N2|J1|J2|J3)?)$/.test(s);

export const spliceCourseCode = (courseCode: string, delimiter: string) =>
  courseCode.slice(0, 4) + delimiter + courseCode.slice(4);

export const round2Decimals = (n: number) => Math.round(n * 100) / 100;

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export const timeSince = (date: Date) => {
  const seconds = Math.floor((new Date().valueOf() - date.valueOf()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + ' years ago';

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + ' months ago';

  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + ' days ago';

  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + ' hours ago';

  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + ' minutes ago';

  return Math.floor(seconds) + ' seconds ago';
};
