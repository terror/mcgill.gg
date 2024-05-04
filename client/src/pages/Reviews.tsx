import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { CourseReview } from '../components/CourseReview';
import { JumpToTopButton } from '../components/JumpToTopButton';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { Review } from '../lib/model';
import { repo } from '../lib/repo';
import { courseIdToUrlParam, spliceCourseCode, timeSince } from '../lib/utils';
import { Loading } from './Loading';

export const Reviews = () => {
  const limit = 20;

  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [reviews, setReviews] = useState<Review[] | undefined>(undefined);
  const [reviewCount, setReviewCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    repo
      .getReviews({ limit, offset: 0, sorted: true, withUserCount: true })
      .then((data) => {
        setReviews(data.reviews);
        setReviewCount(data.uniqueUserCount);
      })
      .catch(() => {
        toast.error('Failed to fetch reviews. Please try again later.');
      });
    setHasMore(true);
    setOffset(limit);
  }, []);

  const fetchMore = async () => {
    const batch = await repo.getReviews({ limit, offset, sorted: true });

    if (batch.reviews.length === 0) setHasMore(false);
    else {
      setReviews(reviews?.concat(batch.reviews));
      setOffset(offset + limit);
    }
  };

  if (reviews === undefined || reviewCount === undefined) {
    return <Loading />;
  }

  return (
    <Layout>
      <Helmet>
        <title>Reviews - mcgill.courses</title>
        <meta
          name='description'
          content='Check out the latest reviews from students of McGill University.'
        />

        <meta property='og:type' content='website' />
        <meta property='og:url' content={`https://mcgill.courses/reviews`} />
        <meta property='og:title' content={`Reviews - mcgill.courses`} />
        <meta
          property='og:description'
          content='Check out the latest reviews from students of McGill University.'
        />

        <meta
          property='twitter:url'
          content={`https://mcgill.courses/reviews`}
        />
        <meta property='twitter:title' content={`Reviews - mcgill.courses`} />
        <meta
          property='twitter:description'
          content='Check out the latest reviews from students of McGill University.'
        />
      </Helmet>

      <div className='flex flex-col items-center py-8'>
        <div className='mb-16'>
          <h1 className='text-center text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-5xl'>
            What people are saying
          </h1>
          <p className='mt-2 text-gray-600 dark:text-gray-400'>
            Check out what {reviewCount.toLocaleString('en-us')} people have
            said about courses at McGill University.
          </p>
        </div>
        <div className='relative flex w-full max-w-xl flex-col lg:max-w-6xl lg:flex-row lg:justify-center'>
          <InfiniteScroll
            dataLength={reviews?.length || 0}
            hasMore={hasMore}
            loader={
              (reviews?.length || 0) >= 20 &&
              hasMore && (
                <div className='mt-4 text-center'>
                  <Spinner />
                </div>
              )
            }
            next={fetchMore}
            style={{ overflowY: 'hidden' }}
          >
            <div className='ml-auto flex w-full max-w-xl flex-col lg:max-w-4xl'>
              {reviews.map((review: Review, i: number) => (
                <div className='mb-6'>
                  <Link
                    to={`/course/${courseIdToUrlParam(review.courseId)}`}
                    className='font-semibold text-gray-800 hover:underline dark:text-gray-200'
                  >
                    {spliceCourseCode(review.courseId, ' ')}
                  </Link>
                  <p className='mb-3 text-xs font-medium text-gray-600 dark:text-gray-400'>
                    {timeSince(
                      new Date(parseInt(review.timestamp.$date.$numberLong))
                    )}
                  </p>
                  <div>
                    <CourseReview
                      key={i}
                      canModify={false}
                      review={review}
                      openEditReview={() => undefined}
                      handleDelete={() => undefined}
                    />
                  </div>
                </div>
              ))}
              {!hasMore ? (
                reviews?.length ? (
                  <div className='mx-[200px] mt-4 text-center'>
                    <p className='text-gray-500 dark:text-gray-400'>
                      No more reviews to show
                    </p>
                  </div>
                ) : (
                  <div className='mt-4 text-center'>
                    <Spinner />
                  </div>
                )
              ) : null}
            </div>
          </InfiniteScroll>
        </div>
      </div>
      <JumpToTopButton />
    </Layout>
  );
};
