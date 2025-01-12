import { Leaf, Snowflake, Sun } from 'lucide-react';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import courseCodes from '../assets/courseCodes.json';
import { useExploreFilterState } from '../hooks/useExploreFilterState';
import { Autocomplete } from './Autocomplete';
import { termColorMap } from './CourseTerms';
import { MultiSelect } from './MultiSelect';
import { ResetButton } from './ResetButton';

const termsOptions = ['Fall', 'Winter', 'Summer'] as const;
type CourseTerm = (typeof termsOptions)[number];

const levelsOptions = ['1XX', '2XX', '3XX', '4XX', '5XX', '6XX', '7XX'];

const sortByOptions = [
  '',
  'Highest Rating',
  'Lowest Rating',
  'Easiest',
  'Hardest',
  'Most Reviews',
  'Least Reviews',
] as const;
export type SortByType = (typeof sortByOptions)[number];

type ExploreFilterProp = {
  variant: 'mobile' | 'desktop';
};

type FilterButtonProp = {
  icon?: JSX.Element;
  className?: string;
  selectedClass?: string;
  isSelected: boolean;
  name: string;
  selections: string[];
  setSelections: (selected: string[]) => void;
};

const FilterButton = ({
  icon,
  className,
  selectedClass,
  isSelected,
  name,
  selections,
  setSelections,
}: FilterButtonProp) => {
  const [selected, setSelected] = useState(isSelected);

  if (isSelected !== selected) setSelected(isSelected);

  const selectedColor = selectedClass ?? 'bg-red-200 text-red-900';

  const unselectedColor =
    'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300';

  return (
    <button
      className={twMerge(
        'rounded-full px-2 py-1 text-sm font-medium tracking-wider transition duration-150 ease-in-out',
        selected ? selectedColor : unselectedColor,
        className
      )}
      onClick={() => {
        setSelected(!selected);
        if (selected) {
          setSelections(selections.filter((selection) => selection !== name));
        } else {
          setSelections(selections.concat(name));
        }
      }}
    >
      <div className='flex items-center gap-x-2'>
        {icon && icon}
        {name}
      </div>
    </button>
  );
};

export const ExploreFilter = ({ variant }: ExploreFilterProp) => {
  const {
    selectedSubjects,
    setSelectedSubjects,
    selectedLevels,
    setSelectedLevels,
    selectedTerms,
    setSelectedTerms,
    sortBy,
    setSortBy,
  } = useExploreFilterState();

  const termToIcon = (term: CourseTerm) => {
    switch (term) {
      case 'Fall':
        return <Leaf size={15} color='brown' />;
      case 'Winter':
        return <Snowflake size={15} color='skyblue' />;
      case 'Summer':
        return <Sun size={15} color='orange' />;
    }
  };

  return (
    <div
      className={twMerge(
        variant === 'mobile' ? 'w-full' : 'w-[340px]',
        'relative flex h-fit flex-col flex-wrap rounded-lg bg-slate-50 px-8 py-6 dark:bg-neutral-800 dark:text-gray-200'
      )}
    >
      <ResetButton
        className='absolute right-4 top-4'
        onClear={() => {
          setSelectedSubjects([]);
          setSelectedLevels([]);
          setSelectedTerms([]);
          setSortBy('');
        }}
      />
      <h1 className='text-sm font-semibold text-gray-600 dark:text-gray-400'>
        Sort By
      </h1>
      <div className='py-1' />
      <div className='relative z-20'>
        <Autocomplete
          options={sortByOptions}
          value={sortBy}
          setValue={setSortBy}
        />
      </div>
      <div className='py-2.5' />
      <h1 className='text-sm font-semibold text-gray-600 dark:text-gray-400'>
        Subject
      </h1>
      <div className='py-1' />
      <div className='relative z-10'>
        <MultiSelect
          options={courseCodes}
          values={selectedSubjects}
          setValues={setSelectedSubjects}
        />
      </div>
      <div className='py-2.5' />
      <h1 className='text-sm font-semibold text-gray-600 dark:text-gray-400'>
        Level
      </h1>
      <div className='py-1' />
      <div className='flex flex-wrap gap-2 py-1'>
        {levelsOptions.map((level, i) => (
          <FilterButton
            key={i}
            name={level}
            isSelected={selectedLevels.includes(level)}
            selections={selectedLevels}
            setSelections={setSelectedLevels}
          />
        ))}
      </div>
      <div className='py-2.5' />
      <h1 className='text-sm font-semibold text-gray-600 dark:text-gray-400'>
        Term
      </h1>
      <div className='py-1' />
      <div className='flex flex-wrap gap-2'>
        {termsOptions.map((term, i) => (
          <FilterButton
            key={i}
            icon={termToIcon(term as CourseTerm)}
            selectedClass={termColorMap[term.toLowerCase()]}
            name={term}
            isSelected={selectedTerms.includes(term)}
            selections={selectedTerms}
            setSelections={setSelectedTerms}
          />
        ))}
      </div>
    </div>
  );
};
