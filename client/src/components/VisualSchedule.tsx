import _ from 'lodash';
import { useEffect, useState } from 'react';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import * as buildingCodes from '../assets/buildingCodes.json';
import type { Block, Course, TimeBlock } from '../lib/model';
import { mod, sortTerms } from '../lib/utils';
import { Tooltip } from './Tooltip';

// Unused component, can use this later for schedule builder

const TIMESLOT_HEIGHT = 20;
const HEIGHT_FACTOR = (TIMESLOT_HEIGHT * 2) / 60;

const vsbDays: Record<string, string> = {
  '1': 'Sun',
  '2': 'Mon',
  '3': 'Tue',
  '4': 'Wed',
  '5': 'Thu',
  '6': 'Fri',
  '7': 'Sat',
};

const convertVsbTime = (time?: string) => {
  if (!time) throw Error('Time is undefined');
  return parseInt(time, 10);
};

const vsbTimeToDisplay = (time?: string) => {
  if (!time) throw Error('Time is undefined');

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

const BlockLocation = ({ location }: { location: string }) => {
  const room = location.split(' ')[0];

  return (
    <span className='relative whitespace-nowrap'>
      <Tooltip text={buildingCodes[room as keyof typeof buildingCodes]}>
        <p className='inline-block cursor-default font-medium'> {location}</p>
      </Tooltip>
    </span>
  );
};

type TimeblockCardProps = {
  hour: number;
  timeblock: TimeBlock;
  block: Block;
};

const TimeblockCard = ({ hour, timeblock, block }: TimeblockCardProps) => {
  const t1 = convertVsbTime(timeblock.t1);
  const t2 = convertVsbTime(timeblock.t2);

  const height = (t2 - t1) * HEIGHT_FACTOR;

  if (height > 40) {
    return (
      <div
        className='absolute left-1/2 top-0 z-10 w-[95%] -translate-x-1/2 rounded-md bg-red-100 p-1'
        style={{
          marginTop: (t1 - hour * 60) * HEIGHT_FACTOR,
          height,
        }}
      >
        <div>
          <div className='text-sm font-semibold text-red-800'>
            {block.display}
          </div>
          <div className='text-sm text-red-800'>
            {vsbTimeToDisplay(timeblock.t1)} - {vsbTimeToDisplay(timeblock.t2)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className='absolute left-1/2 top-0 z-10 w-[95%] -translate-x-1/2 rounded-md bg-red-100 p-1'
      style={{
        marginTop: (t1 - hour * 60) * HEIGHT_FACTOR,
        height,
      }}
    >
      <Tooltip
        text={`${vsbTimeToDisplay(timeblock?.t1)} - ${vsbTimeToDisplay(
          timeblock?.t2
        )}`}
        className='whitespace-nowrap'
      >
        <div>
          <div className='text-sm font-semibold text-red-800'>
            {block.display}
          </div>
        </div>
      </Tooltip>
    </div>
  );
};

type ScheduleDayProps = {
  day: string;
  blocks?: Block[];
};

const timeRange = _.range(8, 18);

const ScheduleDay = ({ day, blocks }: ScheduleDayProps) => {
  const dayBlocks = blocks?.map((block) => ({
    ...block,
    timeblocks: block?.timeblocks?.filter((b) => b.day === day),
  }));

  if (!dayBlocks) return null;

  return (
    <div className='col-span-1'>
      <div
        className='border border-l-0 border-t-0 text-center text-sm text-gray-500'
        key={day}
      >
        {vsbDays[day]}
      </div>
      {timeRange.map((t) => {
        let tb: TimeBlock | undefined = undefined;
        let block: Block | undefined = undefined;

        for (const b of dayBlocks) {
          const blockIndex = b?.timeblocks?.findIndex((b) => {
            const time = convertVsbTime(b.t1);
            return time >= t * 60 && time <= (t + 1) * 60;
          });

          if (!blockIndex) continue;

          if (blockIndex !== -1) {
            tb = b?.timeblocks?.at(blockIndex);
            block = b;
            b?.timeblocks?.splice(blockIndex);
          }
        }

        return (
          <div className='relative' key={`day-${day}-time-${t}`}>
            <div className='border' style={{ height: TIMESLOT_HEIGHT }} />
            <div
              className='border-x border-b'
              style={{ height: TIMESLOT_HEIGHT }}
            />
            {tb && block && (
              <TimeblockCard hour={t} timeblock={tb} block={block} />
            )}
          </div>
        );
      })}
    </div>
  );
};

type VisualScheduleProps = {
  course: Course;
};

export const VisualSchedule = ({ course }: VisualScheduleProps) => {
  if (!course.schedule) return null;

  const terms = _.groupBy(course.schedule, (s) => s.term);
  const offeredTerms = sortTerms(Object.keys(terms));

  const [term, setTerm] = useState(offeredTerms[0]);
  const [blockIndex, setBlockIndex] = useState(0);

  useEffect(() => {
    setTerm(offeredTerms[0]);
    setBlockIndex(0);
  }, [course]);

  const handleTermClick = (t: string) => {
    return () => {
      setTerm(t);
      setBlockIndex(0);
    };
  };

  if (!(term in terms)) return null;

  const updateIndex = (n: number) => {
    return () => {
      setBlockIndex(mod(blockIndex + n, terms[term].length));
    };
  };

  const schedule = terms[term][blockIndex];
  const firstBlock = schedule?.blocks?.at(0);

  if (!schedule) {
    return null;
  }

  const arrowsDisabled = terms[term].length === 1;

  return (
    <div className='mt-4 w-full overflow-hidden rounded-lg bg-slate-50 shadow-sm'>
      <div className='flex w-full border-b'>
        {Object.keys(terms).map((t) => (
          <div
            className={twMerge(
              'flex-1 cursor-pointer p-2 text-center transition duration-200',
              t === term ? 'bg-slate-200' : 'hover:bg-gray-100'
            )}
            onClick={handleTermClick(t)}
            key={t}
          >
            {t}
          </div>
        ))}
      </div>
      <div className='flex gap-x-6 px-6 py-3'>
        <div className='flex items-center gap-x-2'>
          <button onClick={updateIndex(-1)} disabled={arrowsDisabled}>
            <LuArrowLeft
              size={20}
              className={twMerge(
                arrowsDisabled
                  ? 'cursor-not-allowed text-gray-500'
                  : 'cursor-pointer'
              )}
            />
          </button>
          <div className='font-medium'>
            {schedule?.blocks?.map((b) => b.display).join(' + ')}
          </div>
          <button onClick={updateIndex(1)} disabled={arrowsDisabled}>
            <LuArrowRight
              size={20}
              className={twMerge(
                arrowsDisabled
                  ? 'cursor-not-allowed text-gray-500'
                  : 'cursor-pointer'
              )}
            />
          </button>
        </div>
        <div>{firstBlock?.campus}</div>
        <span className='inline-block font-medium'>
          {((split) =>
            split?.map((location: string, index) => (
              <span key={index}>
                <BlockLocation location={location.trim()} />
                {index !== split.length - 1 && (
                  <span className='inline-block'>,&nbsp;</span>
                )}
              </span>
            )))(firstBlock?.location?.split(';'))}
        </span>
        <div className='ml-auto'>
          ({blockIndex + 1}/{terms[term].length})
        </div>
      </div>
      <div className='grid grid-cols-[40px_repeat(5,minmax(0,1fr))] p-6'>
        <div className='col-span-1'>
          <div className='mt-4' />
          {timeRange.map((h) => (
            <div
              className='mr-2 text-right text-xs text-gray-500'
              style={{ height: TIMESLOT_HEIGHT * 2 }}
              key={`time-${h}`}
            >
              {h}:00
            </div>
          ))}
        </div>
        {['2', '3', '4', '5', '6'].map((day) => (
          <ScheduleDay day={day} blocks={schedule.blocks} key={`day-${day}`} />
        ))}
      </div>
    </div>
  );
};
