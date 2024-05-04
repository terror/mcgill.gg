import type { Course, Instructor, Schedule } from '../lib/model';

/**
 * Extracts a list of unique instructors for each term associated with a course.
 *
 * Ensures that only one instructor per term is listed, and adds a placeholder
 * if no instructor is assigned for a term.
 *
 * @param course The course object containing instructors and terms.
 * @returns An array of instructors, one per term, sorted by term order: Fall, Winter, Summer.
 */
export const uniqueTermInstructors = (course: Course) => {
  const termInstructors = course.instructors.filter((i: Instructor) =>
    course.terms.includes(i.term)
  );

  const unique = [],
    filledTerms = new Set();

  for (const instructor of termInstructors) {
    if (!filledTerms.has(instructor.term)) {
      unique.push(instructor);
      filledTerms.add(instructor.term);
    }
  }

  const order = ['Fall', 'Winter', 'Summer'];

  for (const term of course.terms)
    if (!filledTerms.has(term))
      unique.push({ term, name: 'No Instructor Assigned' });

  unique.sort((a, b) => order.indexOf(a.term) - order.indexOf(b.term));

  return unique;
};

/**
 * Determines the current academic terms based on the current date.
 *
 * @returns An array of three strings representing the current Fall, Winter, and Summer terms.
 */
export const getCurrentTerms = (): [string, string, string] => {
  const now = new Date();

  const month = now.getMonth() + 1,
    year = now.getFullYear();

  if (month >= 8)
    return [`Fall ${year}`, `Winter ${year + 1}`, `Summer ${year + 1}`];

  return [`Fall ${year - 1}`, `Winter ${year}`, `Summer ${year}`];
};

/**
 * Filters a list of instructors to those who are teaching in the current terms.
 *
 * @param instructors An array of Instructor objects to filter.
 * @returns A filtered array of instructors teaching in current terms.
 */
export const filterCurrentInstructors = (instructors: Instructor[]) => {
  const currentTerm = getCurrentTerms();
  return instructors.filter((i) => currentTerm.includes(i.term));
};

/**
 * Sorts a list of academic terms in ascending order by year, then by term within the same year.
 *
 * @param terms An array of term strings to sort.
 * @returns A sorted array of terms.
 */
export const sortTerms = (terms: string[]): string[] => {
  const order = ['Fall', 'Winter', 'Summer'];

  return terms.sort((a, b) => {
    return a.split(' ')[1] === b.split(' ')[1]
      ? order.indexOf(a.split(' ')[0]) - order.indexOf(b.split(' ')[0])
      : parseInt(a.split(' ')[1], 10) - parseInt(b.split(' ')[1], 10);
  });
};

/**
 * Sorts a list of schedules by their type and numerical block in ascending order.
 *
 * Assumes schedules may have an undefined blocks array and each block may have an
 * undefined display property.
 *
 * @param schedules An array of Schedule objects to sort.
 * @returns A sorted array of schedules, stable sorted by type and block number where data is available.
 */
export const sortSchedulesByBlocks = (schedules: Schedule[]) => {
  const order = ['Lec', 'Lab', 'Seminar', 'Tut', 'Conf'];

  return schedules.sort((a, b) => {
    const aDisplay = a.blocks?.[0]?.display,
      bDisplay = b.blocks?.[0]?.display;

    if (!aDisplay || !bDisplay)
      return !aDisplay && !bDisplay ? 0 : !aDisplay ? 1 : -1;

    const aParts = aDisplay.split(' '),
      bParts = bDisplay.split(' ');
    const aType = aParts[0],
      bType = bParts[0];
    const aNum = parseInt(aParts[1], 10),
      bNum = parseInt(bParts[1], 10);

    if (aType === bType) return aNum - bNum;

    return order.indexOf(aType) - order.indexOf(bType);
  });
};

/**
 * Returns the URL of the API from the environment configuration.
 *
 * @returns The base URL of the API.
 */
export const getUrl = (): string => import.meta.env.VITE_API_URL ?? '';

/**
 * Formats a course ID into a URL-friendly parameter by inserting a dash
 * after the fourth character.
 *
 * @param courseId The course ID to format.
 * @returns The formatted course ID as a URL parameter.
 */
export const courseIdToUrlParam = (courseId: string) =>
  `${courseId.slice(0, 4)}-${courseId.slice(4)}`.toLowerCase();

/**
 * Capitalizes the first letter of a string.
 *
 * @param s The string to capitalize.
 * @returns The capitalized string.
 */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Ensures that a string ends with a period.
 *
 * @param s The string to punctuate.
 * @returns The punctuated string.
 */
export const punctuate = (s: string): string =>
  s.charAt(s.length - 1) === '.' ? s : s + '.';

/**
 * Validates if a string matches the expected course code format.
 *
 * @param s The string to validate.
 * @returns True if the string is a valid course code, otherwise false.
 */
export const isValidCourseCode = (s: string) =>
  /^(([A-Z0-9]){4} [0-9]{3}(D1|D2|N1|N2|J1|J2|J3)?)$/.test(s);

/**
 * Inserts a delimiter into a course code after the fourth character.
 *
 * @param courseCode The course code to modify.
 * @param delimiter The delimiter to insert.
 * @returns The modified course code.
 */
export const spliceCourseCode = (courseCode: string, delimiter: string) =>
  courseCode.slice(0, 4) + delimiter + courseCode.slice(4);

/**
 * Rounds a number to two decimal places.
 *
 * @param n The number to round.
 * @returns The rounded number.
 */
export const round2Decimals = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes the modulo of two numbers, accounting for negative dividends.
 *
 * @param n The dividend.
 * @param m The divisor.
 * @returns The modulo result.
 */
export const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Computes the time elapsed since a given date, returning a string that describes the time in the largest whole unit (e.g., years, months, days).
 *
 * @param date The Date instance to compute the time since.
 * @returns A string representing the time elapsed since the given date.
 */
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
