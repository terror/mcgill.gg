import _ from 'lodash';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { IoIosArrowDown } from 'react-icons/io';
import { twMerge } from 'tailwind-merge';

import * as buildingCodes from '../assets/buildingCodes.json';
import { sortTerms } from '../lib/utils';
import type { Course } from '../model/Course';
import type { Block, Schedule } from '../model/Schedule';
import { BuildingLocation } from './BuildingLocation';
import { Tooltip } from './Tooltip';

const VSBtimeToDisplay = (time: string) => {
  const approxTimeOfTheDay = parseInt(time, 10) / 60;
  const hour = Math.floor(approxTimeOfTheDay);
  const minute = Math.round((approxTimeOfTheDay - hour) * 60);

  return `${hour.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
  })}:${minute.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
  })}
  `;
};

type ScheduleBlock = Omit<Block, 'timeblocks'> & {
  timeblocks: RepeatingBlock[];
};

type RepeatingBlock = {
  days: string[];
  startTime: string;
  endTime: string;
};

const getSections = (
  schedules: Schedule[]
): Record<string, ScheduleBlock[]> => {
  // Group the unique sections by term, i.e Lec 001, Lec 002, Lab 003, etc.
  const termBlocks = _.mapValues(
    _.groupBy(schedules, (s) => s.term),
    (scheds) =>
      _.sortBy(
        _.uniqBy(
          scheds.flatMap((s) => s.blocks),
          (b) => b.display
        ),
        (b) => b.display.split(' ', 2)[1]
      )
  );

  // For each section, group together all timeblocks that occur at the same time
  // into a single RepeatingBlock.
  const termBlockTimes = _.mapValues(termBlocks, (blocks) =>
    blocks.map((b) => ({
      ...b,
      timeblocks: Object.entries(
        _.groupBy(b.timeblocks, (tb) => `${tb.t1}-${tb.t2}`)
      ).map(([time, tbs]) => {
        const [t1, t2] = time.split('-', 2);
        return {
          days: tbs.map((tb) => tb.day),
          startTime: VSBtimeToDisplay(t1),
          endTime: VSBtimeToDisplay(t2),
        };
      }),
    }))
  );

  return termBlockTimes;
};

const BlockLocation = ({ location }: { location: string }) => {
  const code = location.split(' ')[0];

  const [isLocationOpen, setIsLocationOpen] = useState(false);

  return (
    <Fragment>
      <span
        className='relative whitespace-nowrap'
        onClick={() => setIsLocationOpen(true)}
      >
        <Tooltip text={buildingCodes[code as keyof typeof buildingCodes]}>
          <p className='inline-block cursor-pointer text-sm leading-7 sm:text-base'>
            {location}
          </p>
        </Tooltip>
      </span>
      <BuildingLocation
        title={buildingCodes[code as keyof typeof buildingCodes]}
        code={code}
        open={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
    </Fragment>
  );
};

type TimeblockDaysProps = {
  days: string[];
};

const TimeblockDays = ({ days }: TimeblockDaysProps) => {
  const dayNums = days.map((d) => parseInt(d, 10));
  return (
    <div className='flex gap-1'>
      {['M', 'T', 'W', 'T', 'F'].map((day, i) => (
        <span
          className={twMerge(
            'text-sm sm:text-base',
            dayNums.includes(i + 2)
              ? 'font-semibold text-gray-800 dark:text-gray-100'
              : 'font-extralight text-gray-400 dark:text-gray-400'
          )}
        >
          {day}
        </span>
      ))}
    </div>
  );
};

type ScheduleRowProps = {
  block: ScheduleBlock;
};

const ScheduleRow = ({ block }: ScheduleRowProps) => {
  return (
    <tr className='p-2 text-left even:bg-slate-100 even:dark:bg-[rgb(48,48,48)]'>
      <td className='whitespace-nowrap pl-4 text-sm font-semibold sm:pl-6 sm:text-base'>
        {block.display}
      </td>
      <td className='py-2 text-gray-700 dark:text-gray-300'>
        <div className='flex flex-col items-start pl-1 text-center font-medium'>
          {((split) =>
            split.map((location: string, index) => (
              <span key={index}>
                <BlockLocation location={location.trim()} />
              </span>
            )))(block.location.split(';'))}
        </div>
      </td>
      <td className='whitespace-nowrap py-2 text-sm font-medium sm:text-base'>
        {block.timeblocks.map((tb) => (
          <div>
            {tb.startTime} - {tb.endTime}
          </div>
        ))}
      </td>
      <td className='p-2'>
        {block.timeblocks.map((tb) => (
          <TimeblockDays days={tb.days} />
        ))}
      </td>
    </tr>
  );
};

type SchedulesDisplayProps = {
  course: Course;
  className?: string;
};

export const SchedulesDisplay = ({
  course,
  className,
}: SchedulesDisplayProps) => {
  const schedules = course.schedule;

  if (!schedules) return null;

  const offeredTerms = sortTerms(
    _.uniq(schedules.map((schedule) => schedule.term))
  );

  const [selectedTerm, setSelectedTerm] = useState(offeredTerms.at(0));
  const [showAll, setShowAll] = useState(false);
  const scheduleByTerm = useMemo(() => getSections(schedules), [course]);
  const [blocks, setBlocks] = useState(
    selectedTerm ? scheduleByTerm[selectedTerm] : undefined
  );

  useEffect(() => {
    setSelectedTerm(offeredTerms.at(0));
  }, [course]);

  useEffect(() => {
    setBlocks(selectedTerm ? scheduleByTerm[selectedTerm] : undefined);
  }, [course, selectedTerm]);

  if (!selectedTerm || !blocks) {
    return null;
  }

  return (
    <div
      className={twMerge(
        'flex flex-col text-gray-800 shadow-sm lg:border-t-0',
        className
      )}
    >
      <div className='flex'>
        {offeredTerms.map((term, i) => (
          <button
            key={i}
            className={twMerge(
              `flex-1 cursor-pointer border-b p-2 text-center text-sm font-medium transition duration-300 ease-in-out dark:border-b-neutral-600 dark:text-gray-200 sm:text-base`,
              term === selectedTerm
                ? 'bg-slate-50 dark:bg-neutral-800'
                : 'bg-slate-200 hover:bg-slate-100 dark:bg-neutral-600 dark:hover:bg-neutral-700',
              i === 0 ? 'rounded-tl-lg' : '',
              i === offeredTerms.length - 1 ? 'rounded-tr-lg' : ''
            )}
            onClick={() => {
              setSelectedTerm(term);
              setShowAll(false);
            }}
          >
            {term}
          </button>
        ))}
      </div>
      <div className='flex flex-col rounded-b-lg bg-slate-50 dark:bg-neutral-800 dark:text-gray-200'>
        <table>
          {blocks.length <= 5 || showAll
            ? blocks.map((s) => <ScheduleRow block={s} />)
            : blocks.slice(0, 5).map((s) => <ScheduleRow block={s} />)}
        </table>
        {blocks.length > 5 && (
          <div className='flex flex-row justify-center'>
            <button
              className='flex flex-row items-center justify-center py-2 text-center font-medium transition duration-300 ease-in-out hover:cursor-pointer dark:text-gray-200'
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show less' : 'Show all'}
              <IoIosArrowDown
                className={`${
                  showAll ? 'rotate-180' : ''
                } mx-2 h-5 w-5 text-gray-900 dark:text-gray-300`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
