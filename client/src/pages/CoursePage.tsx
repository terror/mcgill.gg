import { useParams } from 'react-router-dom';

import { CourseRequirements } from '../components/CourseRequirements';
import { CourseReview } from '../components/CourseReview';
import { Layout } from '../components/Layout';
import { Course } from '../model/course';
import { Requirements } from '../model/requirements';
import { Review } from '../model/review';

export const CoursePage = () => {
  const params = useParams<{ id: string }>();
  const review: Review = {
    courseId: 'MATH240',
    instructor: 'Adrian Roshan Vetta',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' +
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' +
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    userId: 'test',
    rating: 4,
  };
  const requirements: Requirements = {
    prereqs: ['MATH 135', 'MATH 136'],
    coreqs: ['MATH 241'],
    restrictions: [],
    otherInformation: [
      'This course is only offered in the Fall',
      'This course is very hard',
    ],
  };

  return (
    <Layout>
      <CourseReview review={review} />
      <CourseRequirements requirements={requirements} />
    </Layout>
  );
};
