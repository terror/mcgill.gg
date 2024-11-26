import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import courseAverageData from '../assets/courseAveragesData.json';
import { AddReviewForm } from '../components/AddReviewForm';
import { CourseAverages } from '../components/CourseAverages';
import { CourseInfo } from '../components/CourseInfo';
import { CourseRequirements } from '../components/CourseRequirements';
import { CourseReview } from '../components/CourseReview';
import { CourseReviewPrompt } from '../components/CourseReviewPrompt';
import { EditReviewForm } from '../components/EditReviewForm';
import { JumpToTopButton } from '../components/JumpToTopButton';
import { Layout } from '../components/Layout';
import { NotFound } from '../components/NotFound';
import { ReviewEmptyPrompt } from '../components/ReviewEmptyPrompt';
import { ReviewFilter, ReviewSortType } from '../components/ReviewFilter';
import { SchedulesDisplay } from '../components/SchedulesDisplay';
import { useAuth } from '../hooks/useAuth';
import { repo } from '../lib/repo';
import { getCurrentTerms } from '../lib/utils';
import type { Course } from '../model/Course';
import { Interaction } from '../model/Interaction';
import type { Requirements } from '../model/Requirements';
import type { Review } from '../model/Review';
import { TermAverage } from '../model/TermAverage';
import { Loading } from './Loading';

export const CoursePage = () => {
  const params = useParams<{ id: string }>();

  const user = useAuth();
  const currentTerms = getCurrentTerms();

  const firstFetch = useRef(true);
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [allReviews, setAllReviews] = useState<Review[] | undefined>(undefined);
  const [userInteractions, setUserInteractions] = useState<
    Interaction[] | undefined
  >([]);
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [editReviewOpen, setEditReviewOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showingReviews, setShowingReviews] = useState<Review[]>([]);

  const [sortBy, setSortBy] = useState<ReviewSortType>('Most Recent');
  const [selectedInstructor, setSelectedInstructor] = useState('');

  useEffect(() => {
    firstFetch.current = true;
    setShowAllReviews(false);
  }, [params.id]);

  const refetch = () => {
    const id = params.id?.replace('-', '').toUpperCase();

    const inner = async () => {
      try {
        const payload = await repo.getCourseWithReviews(id);

        if (payload === null) {
          setCourse(null);
          return;
        }

        if (firstFetch.current) setCourse(payload.course);

        setShowingReviews(payload.reviews);
        setAllReviews(payload.reviews);

        if (user && id) {
          const courseInteractionsPayload =
            await repo.getUserInteractionsForCourse(id, user.id);

          setUserInteractions(courseInteractionsPayload.interactions);
        }

        firstFetch.current = false;
      } catch (err) {
        toast.error(
          'An error occurred while trying to fetch course information.'
        );
      }
    };

    inner();
  };

  useEffect(refetch, [params.id]);

  if (course === null) {
    return (
      <Layout>
        <NotFound />
      </Layout>
    );
  }

  if (course === undefined || showingReviews === undefined) {
    return <Loading />;
  }

  if (course.terms.some((term) => !currentTerms.includes(term))) {
    setCourse({
      ...course,
      terms: course.terms.filter((term) => currentTerms.includes(term)),
    });
  }

  const requirements: Requirements = {
    prereqs: course.prerequisites,
    coreqs: course.corequisites,
    restrictions: course.restrictions,
    prerequisitesText: course.prerequisitesText,
    corequisitesText: course.corequisitesText,
  };

  const userReview = showingReviews?.find((r) => r.userId === user?.id);
  const canReview = Boolean(
    user && !allReviews?.find((r) => r.userId === user?.id)
  );

  const allCourseAverages: Record<string, TermAverage[]> =
    courseAverageData as Record<string, TermAverage[]>;
  const courseAverages: TermAverage[] = allCourseAverages[course._id];

  const handleSubmit = (successMessage: string) => {
    return (res: Response) => {
      if (res.ok) {
        toast.success(successMessage);
        setAddReviewOpen(false);
        refetch();
      } else {
        toast.error('An error occurred.');
      }
    };
  };

  const handleDelete = async (review: Review) => {
    const res = await repo.deleteReview(review.courseId);

    if (res.ok) {
      setShowingReviews(
        showingReviews.filter((r) => r.userId !== review.userId)
      );
      setAllReviews(
        allReviews?.filter(
          (r) => r.userId !== review.userId && r.courseId === review.courseId
        )
      );
    }

    handleSubmit('Review deleted successfully.')(res);

    localStorage.removeItem(course._id);
  };

  const updateLikes = (review: Review) => {
    return (likes: number) => {
      if (allReviews) {
        const updated = allReviews.slice();
        const r = updated.find(
          (r) => r.courseId == review.courseId && r.userId == review.userId
        );

        if (r === undefined) {
          toast.error("Can't update likes for review that doesn't exist.");
          return;
        }

        r.likes = likes;
        setAllReviews(updated);
      }
    };
  };

  return (
    <Layout>
      <Helmet>
        <title>
          {course._id} - {course.title} - mcgill.courses
        </title>
        <meta name='description' content={course.description} />

        <meta property='og:type' content='website' />
        <meta
          property='og:url'
          content={`https://mcgill.courses/${course._id}`}
        />
        <meta
          property='og:title'
          content={`${course._id}- ${course.title} - mcgill.courses`}
        />
        <meta property='og:description' content={course.description} />

        <meta
          property='twitter:url'
          content={`https://mcgill.courses/${course._id}`}
        />
        <meta
          property='twitter:title'
          content={`${course._id}- ${course.title} - mcgill.courses`}
        />
        <meta property='twitter:description' content={course.description} />
      </Helmet>

      <div className='mx-auto mt-10 max-w-6xl md:mt-0'>
        <CourseInfo
          course={course}
          allReviews={showingReviews}
          numReviews={showingReviews.length}
        />
        <div className='py-2.5' />
        <div className='hidden gap-x-6 lg:grid lg:grid-cols-5'>
          <div className='col-span-3'>
            <SchedulesDisplay
              course={course}
              className={canReview ? 'mb-4' : ''}
            />
            {canReview && (
              <CourseReviewPrompt
                openAddReview={() => setAddReviewOpen(true)}
              />
            )}
            <div className='py-2' />
            {allReviews && allReviews.length > 0 ? (
              <div className='mb-2'>
                <ReviewFilter
                  course={course}
                  allReviews={allReviews ?? []}
                  setReviews={setShowingReviews}
                  setShowAllReviews={setShowAllReviews}
                  sortBy={sortBy}
                  selectedInstructor={selectedInstructor}
                  setSortBy={setSortBy}
                  setSelectedInstructor={setSelectedInstructor}
                />
              </div>
            ) : (
              <ReviewEmptyPrompt className='my-8'>
                No reviews have been left for this course yet, be the first!
              </ReviewEmptyPrompt>
            )}
            <div className='w-full shadow-sm'>
              {userReview && (
                <CourseReview
                  canModify={Boolean(user && userReview.userId === user.id)}
                  handleDelete={() => handleDelete(userReview)}
                  openEditReview={() => setEditReviewOpen(true)}
                  review={userReview}
                  interactions={userInteractions}
                  updateLikes={updateLikes(userReview)}
                />
              )}
              {showingReviews.length > 0
                ? showingReviews
                    .filter((review) =>
                      user ? review.userId !== user.id : true
                    )
                    .slice(0, showAllReviews ? showingReviews.length : 8)
                    .map((review, i) => (
                      <CourseReview
                        canModify={Boolean(user && review.userId === user.id)}
                        interactions={userInteractions}
                        handleDelete={() => handleDelete(review)}
                        key={i}
                        openEditReview={() => setEditReviewOpen(true)}
                        review={review}
                        updateLikes={updateLikes(review)}
                      />
                    ))
                : allReviews &&
                  allReviews.length > 0 && (
                    <ReviewEmptyPrompt className='my-8'>
                      No reviews have been left for this course with this
                      instructor yet.
                    </ReviewEmptyPrompt>
                  )}
            </div>
            {!showAllReviews && showingReviews.length > 8 && (
              <div className='flex justify-center text-gray-400 dark:text-neutral-500'>
                <button
                  className='size-full border border-dashed border-neutral-400 py-2 dark:border-neutral-500'
                  onClick={() => setShowAllReviews(true)}
                >
                  Show all {showingReviews.length} reviews
                </button>
              </div>
            )}
          </div>

          <div className='col-span-2 flex flex-col gap-5'>
            <CourseRequirements course={course} requirements={requirements} />
            {courseAverages && courseAverages.length >= 1 && (
              <CourseAverages course={course} averages={courseAverages} />
            )}
          </div>
        </div>
        <div className='flex flex-col lg:hidden'>
          <div className='mb-4 flex'>
            <CourseRequirements course={course} requirements={requirements} />
          </div>

          <div className='mb-4 flex'>
            {courseAverages && courseAverages.length >= 1 && (
              <CourseAverages course={course} averages={courseAverages} />
            )}
          </div>
          <SchedulesDisplay course={course} />
          <div className='mt-4 flex w-full flex-row justify-between'>
            <div className='w-full'>
              {canReview && (
                <CourseReviewPrompt
                  openAddReview={() => setAddReviewOpen(true)}
                />
              )}
              {allReviews && allReviews.length > 0 ? (
                <div className='my-2'>
                  <ReviewFilter
                    course={course}
                    allReviews={allReviews ?? []}
                    setReviews={setShowingReviews}
                    setShowAllReviews={setShowAllReviews}
                    sortBy={sortBy}
                    selectedInstructor={selectedInstructor}
                    setSortBy={setSortBy}
                    setSelectedInstructor={setSelectedInstructor}
                  />
                </div>
              ) : (
                <ReviewEmptyPrompt className='my-8'>
                  No reviews have been left for this course yet, be the first!
                </ReviewEmptyPrompt>
              )}
              <div className='w-full shadow-sm'>
                {userReview && (
                  <CourseReview
                    canModify={Boolean(user && userReview.userId === user.id)}
                    handleDelete={() => handleDelete(userReview)}
                    openEditReview={() => setEditReviewOpen(true)}
                    review={userReview}
                    interactions={userInteractions}
                    updateLikes={updateLikes(userReview)}
                  />
                )}
                {showingReviews.length > 0
                  ? showingReviews
                      .filter((review) =>
                        user ? review.userId !== user.id : true
                      )
                      .slice(0, showAllReviews ? showingReviews.length : 8)
                      .map((review, i) => (
                        <CourseReview
                          canModify={Boolean(user && review.userId === user.id)}
                          handleDelete={() => handleDelete(review)}
                          key={i}
                          openEditReview={() => setEditReviewOpen(true)}
                          review={review}
                          interactions={userInteractions}
                          updateLikes={updateLikes(review)}
                        />
                      ))
                  : allReviews &&
                    allReviews.length > 0 && (
                      <ReviewEmptyPrompt className='my-8'>
                        No reviews have been left for this course with this
                        instructor yet.
                      </ReviewEmptyPrompt>
                    )}
              </div>
              {!showAllReviews && showingReviews.length > 8 && (
                <div className='flex justify-center text-gray-400 dark:text-neutral-500'>
                  <button
                    className='size-full border border-dashed border-neutral-400 py-2 dark:border-neutral-500'
                    onClick={() => setShowAllReviews(true)}
                  >
                    Show all {showingReviews.length} reviews
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <AddReviewForm
          course={course}
          open={addReviewOpen}
          onClose={() => setAddReviewOpen(false)}
          handleSubmit={handleSubmit('Review added successfully.')}
        />
        {userReview && (
          <EditReviewForm
            course={course}
            open={editReviewOpen}
            onClose={() => setEditReviewOpen(false)}
            review={userReview}
            handleSubmit={handleSubmit('Review edited successfully.')}
          />
        )}
      </div>
      <JumpToTopButton />
    </Layout>
  );
};
