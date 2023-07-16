import { ExternalLink } from 'react-feather';
import { HiChartBar, HiChartPie } from 'react-icons/hi';
import { useState } from 'react';
import { Course } from '../model/Course';
import { CourseTerms } from './CourseTerms';
import { RatingInfo } from './RatingInfo';
import { Review } from '../model/Review';
import { countRatings } from '../lib/utils';

type CourseInfoProps = {
  course: Course;
  reviews: Review[];
};

export const CourseInfo = ({ course, reviews }: CourseInfoProps) => {
  const ratingMap: number[] = countRatings('rating', reviews);
  const difficultyMap: number[] = countRatings('difficulty', reviews);
  const numReviews = reviews.length;

  const [chartType, setChartType] = useState<'pie' | 'histogram'>('pie');

  return (
    <div className='flex justify-center'>
      <div className='mx-8 flex w-screen flex-row rounded-md bg-slate-50 p-6 dark:bg-neutral-800 md:mt-10'>
        <div className='flex flex-1 flex-col md:flex-row'>
          <div className='m-4 flex w-fit flex-col space-y-3 md:m-4 md:w-1/2'>
            <div className='flex flex-row space-x-2 align-middle'>
              <h1 className='break-words text-4xl font-semibold text-gray-800 dark:text-gray-200'>
                {course._id}
              </h1>
              {course.url ? (
                <a
                  href={course.url}
                  className='my-auto dark:text-gray-200'
                  target='_blank'
                >
                  <ExternalLink
                    size={20}
                    className='ml-1 transition-colors duration-300 hover:stroke-red-600'
                  />
                </a>
              ) : null}
            </div>
            <h2 className='text-3xl text-gray-800 dark:text-gray-200'>
              {course.title}
            </h2>
            <div className='m-4 mx-auto flex w-full flex-col items-center justify-center space-y-3 md:hidden'>
              <RatingInfo
                title={'Rating'}
                chartType={chartType}
                ratings={ratingMap}
                numReviews={numReviews}
              />
              <RatingInfo
                title={'Difficulty'}
                chartType={chartType}
                ratings={difficultyMap}
                numReviews={numReviews}
              />
              <div className='mx-auto flex flex-row md:hidden'>
                <HiChartPie
                  className={classNames(
                    'm-2 mr-2 cursor-pointer ',
                    chartType === 'pie'
                      ? 'text-red-600 dark:text-red-600'
                      : 'text-neutral-800 dark:text-gray-200'
                  )}
                  onClick={() => setChartType('pie')}
                  size={30}
                />
                <HiChartBar
                  className={classNames(
                    'm-2 mr-2 cursor-pointer ',
                    chartType === 'histogram'
                      ? 'text-red-600 dark:text-red-600'
                      : 'text-neutral-800 dark:text-gray-200'
                  )}
                  onClick={() => setChartType('histogram')}
                  size={30}
                />
              </div>
            </div>
            <CourseTerms course={course} variant='large' />
            <p className='break-words text-gray-500 dark:text-gray-400'>
              {course.description}
            </p>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {numReviews} reviews
            </p>
          </div>
          <div className='mx-auto my-auto flex w-1/2 flex-col'>
            <div className='m-4 mx-auto hidden h-full w-full flex-col items-center justify-center space-y-5 md:flex'>
              <RatingInfo
                title={'Rating'}
                chartType={chartType}
                ratings={ratingMap}
                numReviews={numReviews}
              />
              <RatingInfo
                chartType={chartType}
                title={'Difficulty'}
                ratings={difficultyMap}
                numReviews={numReviews}
              />
            </div>
            <div className='mx-auto mt-auto hidden md:flex'>
              <HiChartPie
                className={classNames(
                  'm-2 mr-2 cursor-pointer ',
                  chartType === 'pie'
                    ? 'text-red-600 dark:text-red-600'
                    : 'text-neutral-800 dark:text-gray-200'
                )}
                onClick={() => setChartType('pie')}
                size={30}
              />
              <HiChartBar
                className={classNames(
                  'm-2 ml-2 cursor-pointer ',
                  chartType === 'histogram'
                    ? 'text-red-600 dark:text-red-600'
                    : 'text-neutral-800 dark:text-gray-200'
                )}
                onClick={() => setChartType('histogram')}
                size={30}
              />
            </div>
          </div>
        </div>
        <h2 className='text-3xl text-gray-800 dark:text-gray-200'>
          {course.title}
        </h2>
        <div className='m-4 mx-auto flex w-fit flex-col items-center justify-center space-y-3 md:hidden'>
          <Charts
            numReviews={numReviews}
            rating={rating}
            difficulty={difficulty}
          />
        </div>
        <CourseTerms course={course} variant='large' />
        <p className='break-words text-gray-500 dark:text-gray-400'>
          {course.description}
        </p>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          {numReviews} reviews
        </p>
      </div>
      <div className='m-4 mx-auto hidden w-fit flex-col items-center justify-center space-y-3 md:m-4 md:flex md:w-1/2 lg:flex-row'>
        <Charts
          numReviews={numReviews}
          rating={rating}
          difficulty={difficulty}
        />
      </div>
    </div>
  );
};
