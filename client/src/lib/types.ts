/*
 Generated by typeshare 1.9.2
*/

export interface Instructor {
  name: string;
  nameNgrams?: string;
  term: string;
}

export type ReqNode =
  | { type: 'Course'; content: string }
  | {
      type: 'Group';
      content: {
        operator: Operator;
        groups: ReqNode[];
      };
    };

export interface TimeBlock {
  day?: string;
  t1?: string;
  t2?: string;
}

export interface Block {
  campus?: string;
  display?: string;
  location?: string;
  timeblocks?: TimeBlock[];
}

export interface Schedule {
  blocks?: Block[];
  term?: string;
}

export interface Course {
  _id: string;
  idNgrams?: string;
  title: string;
  titleNgrams?: string;
  credits: string;
  subject: string;
  code: string;
  level: string;
  url: string;
  department: string;
  faculty: string;
  facultyUrl: string;
  terms: string[];
  description: string;
  instructors: Instructor[];
  prerequisitesText?: string;
  corequisitesText?: string;
  prerequisites: string[];
  corequisites: string[];
  leadingTo: string[];
  logicalPrerequisites?: ReqNode;
  logicalCorequisites?: ReqNode;
  restrictions?: string;
  schedule?: Schedule[];
  avgRating: number;
  avgDifficulty: number;
  reviewCount: number;
}

export enum InteractionKind {
  Like = 'like',
  Dislike = 'dislike',
}

export interface Interaction {
  kind: InteractionKind;
  userId: string;
  courseId: string;
  referrer: string;
}

export interface Review {
  content: string;
  courseId: string;
  instructors: string[];
  rating: number;
  difficulty: number;
  timestamp: DateTime;
  userId: string;
  likes: number;
}

export interface Notification {
  review: Review;
  seen: boolean;
  userId: string;
}

export interface Requirements {
  prerequisitesText?: string;
  corequisitesText?: string;
  corequisites: string[];
  prerequisites: string[];
  restrictions?: string;
  logicalPrerequisites?: ReqNode;
  logicalCorequisites?: ReqNode;
}

export interface SearchResults {
  courses: Course[];
  instructors: Instructor[];
}

export interface Subscription {
  courseId: string;
  userId: string;
}

export interface GetCoursesPayload {
  courses: Course[];
  courseCount?: number;
}

export interface GetCoursePayload {
  course: Course;
  reviews?: Review[];
}

export interface GetInstructorPayload {
  instructor?: Instructor;
  reviews: Review[];
}

export interface GetInteractionKindPayload {
  kind?: InteractionKind;
}

export interface GetCourseReviewsInteractionPayload {
  course_id: string;
  interactions: Interaction[];
}

export interface GetReviewsPayload {
  reviews: Review[];
  uniqueUserCount?: number;
}

export interface User {
  id: string;
  mail: string;
}

export interface UserResponse {
  user?: User;
}

export enum Operator {
  And = 'AND',
  Or = 'OR',
}

export interface DateTime {
  $date: {
    $numberLong: string;
  };
}
