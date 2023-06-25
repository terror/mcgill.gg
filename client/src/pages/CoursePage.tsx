import _ from 'lodash';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from 'react-router-dom';
import Graph from 'react-graph-vis';

import { useNavigate } from 'react-router-dom';
import { AddReviewForm } from '../components/AddReviewForm';
import { Alert } from '../components/Alert';
import { CourseInfo } from '../components/CourseInfo';
import { CourseRequirements } from '../components/CourseRequirements';
import { CourseReview } from '../components/CourseReview';
import { CourseReviewPrompt } from '../components/CourseReviewPrompt';
import { EditReviewForm } from '../components/EditReviewForm';
import { Layout } from '../components/Layout';
import { NotFound } from '../components/NotFound';
import { ReviewFilter } from '../components/ReviewFilter';
import { SchedulesDisplay } from '../components/SchedulesDisplay';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { fetchClient } from '../lib/fetchClient';
import { getCurrentTerms } from '../lib/utils';
import { Course } from '../model/Course';
import { Requirements } from '../model/Requirements';
import { Review } from '../model/Review';

export const CoursePage = () => {
  const params = useParams<{ id: string }>();

  const navigate = useNavigate();

  const [allReviews, setAllReviews] = useState<Review[] | undefined>(undefined);
  const [course, setCourse] = useState<Course>();
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showingReviews, setShowingReviews] = useState<Review[]>([]);

  const currentTerms = getCurrentTerms();

  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [editReviewOpen, setEditReviewOpen] = useState(false);
  const [key, setKey] = useState(0);

  const [alertStatus, setAlertStatus] = useState<'success' | 'error' | null>(
    null
  );

  const [alertMessage, setAlertMessage] = useState('');

  const user = useAuth();

  const connected = course?.prerequisites?.map((prereq, i) => {
    return {
      id: i + 2,
      label: prereq,
    };
  });

  const graphNodes = [
    { id: 1, label: course?._id, title: course?.description },
    ...(connected || []),
  ];

  const graph = {
    nodes: graphNodes,
    edges: [
      ...(connected || []).map((c) => {
        return { from: c.id, to: 1 };
      }),
    ],
  };

  const options = {
    layout: {
      hierarchical: false,
    },
    edges: {
      color: '#FFFFFF',
    },
    height: '500px',
  };

  const events = {
    select: ({ nodes }: { nodes: number[] }) => {
      if (nodes.length === 0) return;
      const node = graphNodes.find((node) => node.id === nodes[0]);
      if (node) navigate(`/course/${node.label!.split(' ').join('')}`);
    },
  };

  useEffect(() => {
    fetchClient
      .getData<Course>(`/courses/${params.id?.toUpperCase()}`)
      .then((data) => setCourse(data))
      .catch((err) => console.log(err));
    fetchClient
      .getData<Review[]>(`/reviews?course_id=${params.id}`)
      .then((data) => {
        data = data.sort(
          (a, b) =>
            parseInt(b.timestamp.$date.$numberLong, 10) -
            parseInt(a.timestamp.$date.$numberLong, 10)
        );
        setShowingReviews(data);
        setAllReviews(data);
      })
      .catch((err) => console.log(err));
  }, [params.id, addReviewOpen, editReviewOpen]);

  if (course === null) {
    return (
      <Layout>
        <NotFound />
      </Layout>
    );
  }

  if (course === undefined || showingReviews === undefined) {
    return (
      <Layout>
        <div className='flex min-h-screen items-center justify-center'>
          <div className='text-center'>
            <Spinner />
          </div>
        </div>
      </Layout>
    );
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
  };

  const canReview = Boolean(
    user && showingReviews.filter((r) => r.userId === user.id).length === 0
  );

  const remountAlert = () => {
    setKey(key + 1);
  };

  const handleSubmit = (successMessage: string) => {
    return (res: Response) => {
      remountAlert();
      if (res.ok) {
        setAlertStatus('success');
        setAlertMessage(successMessage);
        setAddReviewOpen(false);
      } else {
        setAlertMessage('An error occurred.');
        setAlertStatus('error');
      }
    };
  };

  const handleDelete = async (review: Review) => {
    const res = await fetchClient.delete(
      '/reviews',
      { course_id: review.courseId },
      { headers: { 'Content-Type': 'application/json' } }
    );

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

  const userReview = allReviews?.find((r) => r.userId === user?.id);

  const averageRating =
    _.sumBy(allReviews, (r) => r.rating) / (allReviews ?? []).length;

  const averageDifficulty =
    _.sumBy(allReviews, (r) => r.difficulty) / (allReviews ?? []).length;

  return (
    <Layout>
      <CourseInfo
        course={course}
        rating={averageRating}
        difficulty={averageDifficulty}
        numReviews={allReviews?.length}
      />
      <SchedulesDisplay course={course} />
      <div className='flex flex-col lg:flex-row'>
        <div className='mt-4 flex lg:hidden'>
          <CourseRequirements requirements={requirements} />
        </div>
        {course.prerequisites.length !== 0 && (
          <div className='mb-1 mt-4 rounded-lg bg-slate-50 dark:bg-neutral-800 lg:hidden'>
            <Graph
              key={uuidv4()}
              graph={graph}
              options={options}
              events={events}
            />
          </div>
        )}
        <div className='flex w-full flex-row justify-between'>
          <div className='my-4 w-full lg:mr-4 lg:mt-4'>
            {canReview && (
              <CourseReviewPrompt
                openAddReview={() => setAddReviewOpen(true)}
              />
            )}
            <div className='mb-4 lg:hidden'>
              <ReviewFilter
                course={course}
                allReviews={allReviews ?? []}
                setReviews={setShowingReviews}
                setShowAllReviews={setShowAllReviews}
              />
            </div>
            <div className='w-full'>
              {userReview && (
                <CourseReview
                  canModify={Boolean(user && userReview.userId === user.id)}
                  handleDelete={() => handleDelete(userReview)}
                  isLast={showingReviews.length === 1}
                  openEditReview={() => setEditReviewOpen(true)}
                  review={userReview}
                />
              )}
              {showingReviews &&
                showingReviews
                  .filter((review) => (user ? review.userId !== user.id : true))
                  .slice(0, showAllReviews ? showingReviews.length : 8)
                  .map((review, i) => (
                    <CourseReview
                      canModify={Boolean(user && review.userId === user.id)}
                      handleDelete={() => handleDelete(review)}
                      isLast={i === showingReviews.length - 1}
                      key={i}
                      openEditReview={() => setEditReviewOpen(true)}
                      review={review}
                    />
                  ))}
              {!showAllReviews && showingReviews.length > 8 && (
                <div className='flex justify-center text-gray-400 dark:text-neutral-500'>
                  <button
                    className='h-full w-full border border-dashed border-neutral-400 py-2 dark:border-neutral-500'
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
        <div className='hidden h-fit w-[50%] lg:mt-4 lg:block'>
          <CourseRequirements requirements={requirements} />
          {course.prerequisites.length !== 0 && (
            <div className='mb-2 mt-3 rounded-lg bg-slate-50 dark:bg-neutral-800'>
              <Graph
                key={uuidv4()}
                graph={graph}
                options={options}
                events={events}
              />
            </div>
          )}
          <div className='mb-10 mt-3'>
            <ReviewFilter
              course={course}
              allReviews={allReviews ?? []}
              setReviews={setShowingReviews}
              setShowAllReviews={setShowAllReviews}
            />
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
      {alertStatus && (
        <Alert status={alertStatus} key={key} message={alertMessage} />
      )}
    </Layout>
  );
};
