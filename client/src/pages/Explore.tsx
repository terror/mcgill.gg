import InfiniteScroll from 'react-infinite-scroll-component';
import { Alert } from '../components/Alert';
import { BoxToggle } from '../components/BoxToggle';
import { Course } from '../model/Course';
import { CourseCard } from '../components/CourseCard';
import { ExploreFilter } from '../components/ExploreFilter';
import { JumpToTopButton } from '../components/JumpToTopButton';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { fetchClient } from '../lib/fetchClient';
import { getCurrentTerms } from '../lib/utils';
import { useEffect, useState } from 'react';

export const Explore = () => {
  const limit = 20;
  const currentTerms = getCurrentTerms();

  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState(false);
  const [filterIsToggled, setFilterIsToggled] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(limit);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [minReviews, setMinReviews] = useState(0);

  const body = {
    subjects: selectedSubjects.length === 0 ? null : selectedSubjects,
    levels:
      selectedLevels.length === 0
        ? null
        : selectedLevels.map((l) => l.charAt(0)),
    terms:
      selectedTerms.length === 0
        ? null
        : selectedTerms.map(
            (term) => currentTerms.filter((t) => t.split(' ')[0] === term)[0]
          ),
    min_reviews: minReviews === 0 ? null : minReviews,
  };

  useEffect(() => {
    fetchClient
      .postData<Course[]>(`/courses?limit=${limit}`, body, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then((data) => setCourses(data))
      .catch((_) => setError(true));
    setHasMore(true);
    setOffset(limit);
  }, [selectedSubjects, selectedLevels, selectedTerms, minReviews]);

  const fetchMore = async () => {
    const batch = await fetchClient.postData<Course[]>(
      `/courses?limit=${limit}&offset=${offset}`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (batch.length === 0) setHasMore(false);
    else {
      setCourses(courses.concat(batch));
      setOffset(offset + limit);
    }
  };

  return (
    <Layout>
      <div className='flex flex-row p-4'>
        {error ? <Alert status='error' /> : null}
        <div className='flex w-full flex-col items-center py-8'>
          {' '}
          <h1 className='mb-16 text-center text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-5xl'>
            {' '}
            Explore all courses
          </h1>
          <div className='w-xl flex flex-col md:flex-row'>
            <div className='md:hidden'>
              <BoxToggle
                child={ExploreFilter({
                  selectedSubjects,
                  setSelectedSubjects,
                  selectedLevels,
                  setSelectedLevels,
                  selectedTerms,
                  setSelectedTerms,
                  setMinReviews,
                  minReviews,
                  variant: 'mobile',
                })}
                isOpen={filterIsToggled}
                setIsOpen={setFilterIsToggled}
              />
            </div>
            <InfiniteScroll
              dataLength={courses.length}
              hasMore={hasMore}
              loader={
                courses.length >= 20 && hasMore ? (
                  <div className='mt-4 text-center'>
                    <Spinner />
                  </div>
                ) : null
              }
              next={fetchMore}
              style={{ overflowY: 'hidden' }}
            >
              <div className='mx-auto flex flex-col'>
                {courses.map((course, i) => (
                  <CourseCard key={i} course={course} />
                ))}
                {!hasMore || courses.length === 0 ? (
                  <div className='mx-[200px] mt-4 text-center'>
                    <p className='text-gray-500 dark:text-gray-400'>
                      No more courses to show
                    </p>
                  </div>
                ) : null}
              </div>
            </InfiniteScroll>
            <div className='hidden md:flex'>
              <ExploreFilter
                selectedSubjects={selectedSubjects}
                setSelectedSubjects={setSelectedSubjects}
                selectedLevels={selectedLevels}
                setSelectedLevels={setSelectedLevels}
                selectedTerms={selectedTerms}
                setSelectedTerms={setSelectedTerms}
                setMinReviews={setMinReviews}
                minReviews={minReviews}
                variant='desktop'
              />
            </div>
          </div>
        </div>{' '}
      </div>
      <JumpToTopButton />
    </Layout>
  );
};
