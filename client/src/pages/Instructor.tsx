import _ from 'lodash';
import { Fragment, useEffect, useState } from 'react';
import { ExternalLink } from 'react-feather';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { CourseInfoStats } from '../components/CourseInfoStats';
import { CourseReview } from '../components/CourseReview';
import { Layout } from '../components/Layout';
import { ReviewEmptyPrompt } from '../components/ReviewEmptyPrompt';
import { useAuth } from '../hooks/useAuth';
import type { Instructor as InstructorType, Review } from '../lib/model';
import { repo } from '../lib/repo';
import { courseIdToUrlParam } from '../lib/utils';
import { Loading } from './Loading';
import { NotFound } from './NotFound';

export const Instructor = () => {
  const params = useParams<{ name: string }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [instructor, setInstructor] = useState<
    InstructorType | undefined | null
  >(undefined);

  const user = useAuth();

  useEffect(() => {
    if (!params.name) return;

    repo
      .getInstructor(params.name)
      .then((data) => {
        setInstructor(data.instructor);
        setReviews(data.reviews);
      })
      .catch(() => {
        toast.error('Failed to fetch instructor.');
      });
  }, [params.name]);

  if (instructor === undefined) return <Loading />;
  if (instructor === null) return <NotFound />;

  const userReview = reviews.find((r) => r.userId === user?.id),
    uniqueReviews = _.uniqBy(reviews, (r) => r.courseId);

  const updateLikes = (review: Review) => {
    return (likes: number) => {
      if (reviews) {
        const updated = reviews.slice();
        const r = updated.find(
          (r) => r.courseId == review.courseId && r.userId == review.userId
        );

        if (r === undefined) {
          toast.error("Can't update likes for review that doesn't exist.");
          return;
        }

        r.likes = likes;
        setReviews(updated);
      }
    };
  };

  return (
    <Layout>
      <Helmet>
        <title>{instructor.name} - mcgill.courses</title>

        <meta property='og:type' content='website' />
        <meta property='og:url' content={`https://mcgill.courses/explore`} />
        <meta
          property='og:title'
          content={`${instructor.name}- mcgill.courses`}
        />

        <meta
          property='twitter:url'
          content={`https://mcgill.courses/explore`}
        />
        <meta
          property='twitter:title'
          content={`${instructor.name}- mcgill.courses`}
        />
      </Helmet>

      <div className='mx-auto mt-10 flex max-w-5xl overflow-hidden md:mt-0'>
        <div className='flex w-screen flex-row rounded-md bg-slate-50 p-2 dark:bg-neutral-800 md:mt-10'>
          <div className='flex flex-1 flex-col md:flex-row'>
            <div className='flex w-fit flex-col p-4 md:w-1/2'>
              <div className='flex flex-row items-center space-x-2 align-middle'>
                <h1 className='break-words text-4xl font-semibold text-gray-800 dark:text-gray-200'>
                  {params.name && decodeURIComponent(params.name)}
                </h1>
                <a
                  href={`https://www.mcgill.ca/search/${params.name}`}
                  className='my-auto dark:text-gray-200'
                  target='_blank'
                >
                  <ExternalLink
                    size={20}
                    className='ml-1 transition-colors duration-300 hover:stroke-red-600'
                  />
                </a>
              </div>
              <p className='mt-4 text-gray-500 dark:text-gray-400'>
                {uniqueReviews.length ? (
                  <div>
                    <div>Teaches or has taught the following course(s): </div>
                    <div className='max-w-sm'>
                      {uniqueReviews.map((review, index) => (
                        <Fragment key={index}>
                          <Link
                            to={`/course/${courseIdToUrlParam(
                              review.courseId
                            )}`}
                            className='font-medium transition hover:text-red-600'
                          >
                            {review.courseId}
                          </Link>
                          {index !== uniqueReviews.length - 1 ? ', ' : '.'}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ) : (
                  "This professor hasn't taught any courses that have been reviewed yet."
                )}
              </p>
              {reviews.length !== 0 && (
                <Fragment>
                  <div className='grow py-3' />
                  <CourseInfoStats className='md:hidden' allReviews={reviews} />
                  <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
                    {reviews.length} review(s)
                  </p>
                </Fragment>
              )}
            </div>
            <div className='ml-10 hidden w-5/12 justify-center rounded-md bg-neutral-50 py-6 dark:bg-neutral-800 md:flex lg:mt-6'>
              <CourseInfoStats variant='large' allReviews={reviews} />
            </div>
          </div>
        </div>
      </div>
      <div className='mx-auto mt-4 max-w-5xl'>
        <div>
          {userReview && (
            <CourseReview
              canModify={false}
              handleDelete={() => undefined}
              includeTaughtBy={false}
              openEditReview={() => undefined}
              review={userReview}
              updateLikes={updateLikes(userReview)}
            />
          )}
          {reviews &&
            reviews
              .filter((review) => (user ? review.userId !== user.id : true))
              .slice(0, showAllReviews ? reviews.length : 8)
              .map((review, i) => (
                <CourseReview
                  canModify={false}
                  handleDelete={() => undefined}
                  includeTaughtBy={false}
                  key={i}
                  openEditReview={() => undefined}
                  review={review}
                  updateLikes={updateLikes(review)}
                />
              ))}
        </div>
        {!showAllReviews && reviews.length > 8 && (
          <div className='flex justify-center text-gray-400 dark:text-neutral-500'>
            <button
              className='h-full w-full border border-dashed border-neutral-400 py-2 dark:border-neutral-500'
              onClick={() => setShowAllReviews(true)}
            >
              Show all {reviews.length} reviews
            </button>
          </div>
        )}
        {reviews.length === 0 && (
          <ReviewEmptyPrompt className='my-8' variant='instructor' />
        )}
      </div>
    </Layout>
  );
};
