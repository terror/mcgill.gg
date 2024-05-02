import Fuse from 'fuse.js';
import _ from 'lodash';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';

import { ReviewSearchBar } from '../components/ReviewSearchBar';
import type { Course } from '../model/Course';
import type { Review } from '../model/Review';
import { Autocomplete } from './Autocomplete';
import { FilterToggle } from './FilterToggle';
import { ResetButton } from './ResetButton';

const sortTypes = [
  'Most Recent',
  'Least Recent',
  'Highest Rating',
  'Lowest Rating',
  'Hardest',
  'Easiest',
  'Most Liked',
  'Most Disliked',
] as const;

export type ReviewSortType = (typeof sortTypes)[number];

type ReviewFilterProps = {
  course: Course;
  allReviews: Review[];
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setShowAllReviews: Dispatch<SetStateAction<boolean>>;
};

export const ReviewFilter = ({
  course,
  allReviews,
  setReviews,
  setShowAllReviews,
}: ReviewFilterProps) => {
  const [sortBy, setSortBy] = useState<ReviewSortType>('Most Recent');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);

  useEffect(() => {
    const allReviewsFilered = allReviews
      .filter(
        (review: Review) =>
          selectedInstructor === '' ||
          review.instructors
            .map((ins) => ins.toLowerCase())
            .includes(selectedInstructor.toLowerCase())
      )
      .sort((a: Review, b: Review) => {
        switch (sortBy) {
          case 'Most Recent':
            return (
              parseInt(b.timestamp.$date.$numberLong, 10) -
              parseInt(a.timestamp.$date.$numberLong, 10)
            );
          case 'Least Recent':
            return (
              parseInt(a.timestamp.$date.$numberLong, 10) -
              parseInt(b.timestamp.$date.$numberLong, 10)
            );
          case 'Highest Rating':
            return b.rating - a.rating;
          case 'Lowest Rating':
            return a.rating - b.rating;
          case 'Hardest':
            return b.difficulty - a.difficulty;
          case 'Easiest':
            return a.difficulty - b.difficulty;
          case 'Most Liked':
            return b.likes - a.likes;
          case 'Most Disliked':
            return a.likes - b.likes;
          default:
            return (
              parseInt(b.timestamp.$date.$numberLong, 10) -
              parseInt(a.timestamp.$date.$numberLong, 10)
            );
        }
      });
    setFilteredReviews(allReviewsFilered);
    setReviews(allReviewsFilered);
    setShowAllReviews(false);
  }, [sortBy, selectedInstructor]);

  const reset = () => {
    setSortBy('Most Recent');
    setSelectedInstructor('');
  };

  useEffect(reset, [course]);

  const fuse = new Fuse(filteredReviews, {
    includeMatches: true,
    minMatchCharLength: 3,
    findAllMatches: true,
    threshold: 0.1,
    keys: ['content'],
  });

  const handleInputChange = (query: string) => {
    setReviewSearchQuery(query);
    if (query === '') {
      setReviews(filteredReviews);
      return;
    }
    fuse.setCollection(filteredReviews);
    const filteredResults = fuse.search(query).map((result) => ({
      ...result.item,
      matches: result.matches?.flatMap((match) => match.indices) ?? [],
    }));
    setReviews(filteredResults);
  };

  const sorts = useMemo(() => sortTypes.slice(), []);
  const uniqueInstructors = _.uniq(course.instructors.map((ins) => ins.name));

  return (
    <div className='flex flex-col rounded-lg dark:bg-neutral-900 dark:text-gray-200'>
      <FilterToggle>
        <ReviewSearchBar
          handleInputChange={handleInputChange}
          query={reviewSearchQuery}
        />
        <div className='py-2' />
        <div className='relative'>
          <div className='p-1'>
            <div className='flex gap-x-2'>
              <div className='w-2/5'>
                <h2 className='mb-2 text-sm font-medium text-gray-600 dark:text-gray-400'>
                  Sort By
                </h2>
                <div className='relative z-10'>
                  <Autocomplete
                    options={sorts}
                    value={sortBy}
                    setValue={(val: string) => setSortBy(val as ReviewSortType)}
                  />
                </div>
              </div>
              <div className='w-3/5'>
                <h2 className='mb-2 text-sm font-medium text-gray-600 dark:text-gray-400'>
                  Instructor
                </h2>
                <div className='relative z-10'>
                  <Autocomplete
                    options={uniqueInstructors}
                    value={selectedInstructor}
                    setValue={setSelectedInstructor}
                  />
                </div>
              </div>
            </div>
          </div>
          <ResetButton
            className='absolute -top-4 right-2 ml-auto'
            onClear={reset}
          />
        </div>
      </FilterToggle>
    </div>
  );
};
