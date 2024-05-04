import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { CourseSearchBar } from '../components/CourseSearchBar';
import { Layout } from '../components/Layout';
import type { SearchResults } from '../lib/model';
import { getSearchIndex, updateSearchResults } from '../lib/searchIndex';

const alerts: Map<string, string> = new Map([
  ['invalidMail', 'Please use a McGill email address to authenticate.'],
]);

const { courses, instructors, coursesIndex, instructorsIndex } =
  getSearchIndex();

export const Home = () => {
  const [searchParams] = useSearchParams();

  const [results, setResults] = useState<SearchResults & { query: string }>({
    query: '',
    courses: [],
    instructors: [],
  });

  useEffect(() => {
    const err = searchParams.get('err');
    if (err === null) return;
    toast.error(alerts.get(err));
  }, []);

  const handleInputChange = (query: string) => {
    updateSearchResults(
      query,
      courses,
      instructors,
      coursesIndex,
      instructorsIndex,
      setResults
    );
  };

  return (
    <Layout>
      <div className='relative isolate px-6 pt-14 lg:px-8'>
        <div className='mx-auto max-w-2xl py-8'>
          <div className='hidden sm:mb-8 sm:flex sm:justify-center'></div>
          <div className='flex flex-col gap-10 text-center'>
            <h1 className='text-left text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200 md:text-5xl'>
              Explore thousands of course and professor reviews from McGill
              students
            </h1>
            <div className='flex flex-col gap-6 text-center'>
              <CourseSearchBar
                results={results}
                handleInputChange={handleInputChange}
              />
              <Link
                to={`/explore`}
                className='mx-auto cursor-pointer text-sm text-gray-500 underline underline-offset-4 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-500 md:text-base'
              >
                or explore all courses <span aria-hidden='true'>&rarr;</span>{' '}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
