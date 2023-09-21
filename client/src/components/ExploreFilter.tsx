import { useState } from 'react';
import { BsSun } from 'react-icons/bs';
import { FaLeaf, FaRegSnowflake } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

import courseCodes from '../assets/courseCodes.json';
import { termColorMap } from './CourseTerms';
import { MultiSelect } from './MultiSelect';
import { ResetButton } from './ResetButton';

const termsOptions = ['Fall', 'Winter', 'Summer'];
type CourseTerm = (typeof termsOptions)[number];
const levelsOptions = ['1XX', '2XX', '3XX', '4XX', '5XX', '6XX', '7XX'];

type ExploreFilterProp = {
  selectedSubjects: string[];
  setSelectedSubjects: (selected: string[]) => void;
  selectedLevels: string[];
  setSelectedLevels: (selected: string[]) => void;
  selectedTerms: string[];
  setSelectedTerms: (selected: string[]) => void;
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
    'bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-100';

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

export const ExploreFilter = ({
  selectedSubjects,
  setSelectedSubjects,
  selectedLevels,
  setSelectedLevels,
  selectedTerms,
  setSelectedTerms,
  variant,
}: ExploreFilterProp) => {
  const termToIcon = (term: CourseTerm) => {
    switch (term) {
      case 'Fall':
        return <FaLeaf color='brown' />;
      case 'Winter':
        return <FaRegSnowflake color='skyblue' />;
      case 'Summer':
        return <BsSun color='orange' />;
    }
  };

  return (
    <div
      className={twMerge(
        variant === 'mobile' ? 'w-full' : 'w-[340px]',
        'flex h-fit flex-col flex-wrap rounded-lg bg-slate-50 px-8 py-6 dark:bg-neutral-800 dark:text-gray-200'
      )}
    >
      <div className='flex flex-row'>
        <h1 className='text-lg font-semibold text-gray-600 dark:text-gray-400'>
          Filter...
        </h1>
        <ResetButton
          className='ml-auto'
          onClear={() => {
            setSelectedSubjects([]);
            setSelectedLevels([]);
            setSelectedTerms([]);
          }}
        />
      </div>
      <div className='py-2.5' />
      <h1 className='font-semibold text-gray-800 dark:text-gray-200'>
        Course Code
      </h1>
      <div className='py-1.5' />
      <MultiSelect
        options={courseCodes}
        values={selectedSubjects}
        setValues={setSelectedSubjects}
      />
      <div>
        <h1 className='mt-3 font-semibold text-gray-800 dark:text-gray-200'>
          Level
        </h1>
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
      </div>
      <div className='space-y-2'>
        <h1 className='mt-3 font-semibold text-gray-800 dark:text-gray-200'>
          Term
        </h1>
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
    </div>
  );
};
