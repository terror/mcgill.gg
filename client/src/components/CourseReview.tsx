import { Transition } from '@headlessui/react';
import { format } from 'date-fns';
import { Edit, Tag } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { BsPinFill } from 'react-icons/bs';
import { LuFlame, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { useAuth } from '../hooks/useAuth';
import { repo } from '../lib/repo';
import { courseIdToUrlParam, spliceCourseCode } from '../lib/utils';
import type { InteractionKind } from '../model/Interaction';
import type { Interaction } from '../model/Interaction';
import type { Review } from '../model/Review';
import { BirdIcon } from './BirdIcon';
import { DeleteButton } from './DeleteButton';
import { IconRating } from './IconRating';
import { Tooltip } from './Tooltip';

// Timestamp of https://github.com/terror/mcgill.courses/pull/500
const RMP_SCRAPE_EPOCH = new Date(1713472800 * 1000);

const LoginPrompt = () => {
  return (
    <div className='absolute bottom-20 end-4 h-fit rounded-md border bg-gray-100 px-2 py-1 text-neutral-800 dark:border-0 dark:bg-neutral-700 dark:text-gray-200 sm:bottom-16'>
      You must be logged in
    </div>
  );
};

type ReviewInteractionsProps = {
  review: Review;
  interactions: Interaction[];
  setPromptLogin: (_: boolean) => void;
  updateLikes: (likes: number) => void;
};

const interactionToNum = (kind: InteractionKind) => {
  return kind === 'like' ? 1 : -1;
};

const getLikeChange = (
  before: InteractionKind | undefined | null,
  after: InteractionKind
) => {
  if (!before) return interactionToNum(after);
  if (before === after) return 0;

  return interactionToNum(after) * 2;
};

const ReviewInteractions = ({
  review,
  interactions,
  setPromptLogin,
  updateLikes,
}: ReviewInteractionsProps) => {
  const user = useAuth();

  const getUserInteractionKind = (
    interactions: Interaction[]
  ): InteractionKind | undefined => {
    const interaction = interactions.find(
      (interaction: Interaction) => interaction.userId === review.userId
    );

    return interaction?.kind;
  };

  const [kind, setKind] = useState<InteractionKind | undefined | null>(
    undefined
  );

  useEffect(
    () => setKind(getUserInteractionKind(interactions)),
    [interactions]
  );

  const { courseId, userId, likes } = review;

  const refreshInteractions = async () => {
    try {
      const payload = await repo.getInteractions(courseId, userId, user?.id);
      setKind(payload.kind);
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const addInteraction = async (interactionKind: InteractionKind) => {
    try {
      await repo.addInteraction(interactionKind, courseId, userId, user?.id);
      const change = getLikeChange(kind, interactionKind);
      updateLikes(review.likes + change);

      await refreshInteractions();

      toast.success(
        `Successfully ${interactionKind}d review for ${spliceCourseCode(
          courseId,
          ' '
        )}.`
      );
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const removeInteraction = async () => {
    try {
      await repo.removeInteraction(courseId, userId, user?.id);
      if (!kind) {
        throw new Error("Can't remove interaction that doesn't exist.");
      }
      updateLikes(review.likes - interactionToNum(kind));

      await refreshInteractions();

      toast.success(
        `Successfully removed interaction for ${spliceCourseCode(
          courseId,
          ' '
        )}.`
      );
    } catch (err: any) {
      toast.error(err.toString());
    }
  };

  const displayLoginPrompt = () => {
    setPromptLogin(true);
    setTimeout(() => setPromptLogin(false), 3000);
  };

  const handleLike = () => {
    user
      ? kind === 'like'
        ? removeInteraction()
        : addInteraction('like')
      : displayLoginPrompt();
  };

  const handleDislike = () => {
    user
      ? kind === 'dislike'
        ? removeInteraction()
        : addInteraction('dislike')
      : displayLoginPrompt();
  };

  return (
    <Fragment>
      <div className='mb-0.5 flex items-center'>
        <div className='flex size-8 items-center justify-center rounded-md text-gray-700 focus:outline-none dark:text-white'>
          <LuThumbsUp
            onClick={handleLike}
            className={twMerge(
              'h-4 w-4 cursor-pointer stroke-gray-500',
              kind === 'like' ? 'stroke-red-600' : ''
            )}
          />
        </div>
        <span className='text-sm font-bold text-gray-700 dark:text-white'>
          {likes}
        </span>
        <div className='flex size-8 items-center justify-center rounded-md text-gray-700 focus:outline-none dark:text-white'>
          <LuThumbsDown
            onClick={handleDislike}
            className={twMerge(
              'h-4 w-4 cursor-pointer stroke-gray-500',
              kind === 'dislike' ? 'stroke-red-600' : ''
            )}
          />
        </div>
      </div>
    </Fragment>
  );
};

type CourseReviewProps = {
  canModify: boolean;
  handleDelete: () => void;
  openEditReview: () => void;
  updateLikes?: (likes: number) => void;
  review: Review;
  interactions?: Interaction[];
  showCourse?: boolean;
  includeTaughtBy?: boolean;
  className?: string;
};

export const CourseReview = ({
  review,
  interactions,
  canModify,
  openEditReview,
  handleDelete,
  updateLikes,
  className,
  includeTaughtBy = true,
}: CourseReviewProps) => {
  const [readMore, setReadMore] = useState(false);
  const [promptLogin, setPromptLogin] = useState(false);

  const date = new Date(parseInt(review.timestamp.$date.$numberLong, 10));

  const shortDate = format(date, 'P'),
    longDate = format(date, 'EEEE, MMMM d, yyyy');

  return (
    <div
      className={twMerge(
        'relative flex w-full flex-col gap-4 border-b-[1px] border-b-gray-300 bg-slate-50 px-6 py-3 first:rounded-t-md last:rounded-b-md last:border-b-0 dark:border-b-gray-600 dark:bg-neutral-800',
        className
      )}
    >
      <div className='flex flex-col'>
        <div className='flex w-full'>
          <div className='relative flex w-full flex-col'>
            <div className='flex w-full'>
              <Tooltip text={longDate} className='w-48'>
                <p className='cursor-default py-2 text-xs font-medium text-gray-700 dark:text-gray-300'>
                  {shortDate}
                </p>
              </Tooltip>
              {date < RMP_SCRAPE_EPOCH && (
                <Tooltip
                  text='External review from RateMyProfessors'
                  className='w-36'
                >
                  <Tag className='ml-2 mt-1 w-4 text-red-600' />
                </Tooltip>
              )}
              {canModify && <BsPinFill className='ml-2 mt-2 text-red-600' />}
              <div className='grow' />
              <div className='flex w-64 flex-col items-end rounded-lg p-2'>
                <div className='flex items-center gap-x-2'>
                  <div className='text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                    Rating
                  </div>
                  <IconRating rating={review.rating} icon={BirdIcon} />
                </div>
                <div className='flex items-center gap-x-2'>
                  <div className='text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                    Difficulty
                  </div>
                  <IconRating rating={review.difficulty} icon={LuFlame} />
                </div>
              </div>
            </div>
            {review.content.length < 300 || readMore ? (
              <div className='ml-1 mr-4 mt-2 hyphens-auto break-words text-left text-gray-800 dark:text-gray-300'>
                {review.content}
              </div>
            ) : (
              <>
                <div className='ml-1 mr-4 mt-2 hyphens-auto break-words text-left text-gray-800 dark:text-gray-300'>
                  {review.content.substring(0, 300) + '...'}
                </div>
                <button
                  className='ml-1 mr-auto pt-1 text-gray-700 underline transition duration-300 ease-in-out hover:text-red-500 dark:text-gray-300 dark:hover:text-red-500'
                  onClick={() => setReadMore(true)}
                >
                  Show more
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className='flex items-center'>
        <p className='mb-2 mt-auto flex-1 text-sm italic leading-4 text-gray-700 dark:text-gray-200'>
          {includeTaughtBy ? (
            <Fragment>
              Taught by{' '}
              {review.instructors.map((instructor, i) => {
                let separator = null;
                if (i === review.instructors.length - 2) {
                  separator = ' and ';
                } else if (i < review.instructors.length - 2) {
                  separator = ', ';
                }
                return (
                  <Fragment key={instructor + review.userId}>
                    <Link
                      to={`/instructor/${encodeURIComponent(instructor)}`}
                      className='font-medium transition hover:text-red-600'
                    >
                      {instructor}
                    </Link>
                    {separator}
                  </Fragment>
                );
              })}
            </Fragment>
          ) : (
            <Fragment>
              Written for{' '}
              <Link
                to={`/course/${courseIdToUrlParam(review.courseId)}`}
                className='font-medium transition hover:text-red-600'
              >
                {review.courseId}
              </Link>
            </Fragment>
          )}
        </p>
        <Transition
          show={promptLogin}
          enter='transition-opacity duration-150'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='transition-opacity duration-150'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <LoginPrompt />
        </Transition>
        <div className='flex items-center'>
          <div className='mb-1 flex'>
            {canModify && (
              <div className='ml-2 mr-1 flex h-fit space-x-2'>
                <div onClick={openEditReview}>
                  <Edit
                    className='cursor-pointer stroke-gray-500 transition duration-200 hover:stroke-gray-800 dark:stroke-gray-400 dark:hover:stroke-gray-200'
                    size={20}
                  />
                </div>
                <DeleteButton
                  title='Delete Review'
                  text={`Are you sure you want to delete your review of ${review.courseId}? `}
                  onConfirm={handleDelete}
                  size={20}
                />
              </div>
            )}
          </div>
          {updateLikes && interactions && (
            <ReviewInteractions
              review={review}
              interactions={interactions}
              setPromptLogin={setPromptLogin}
              updateLikes={updateLikes}
            />
          )}
        </div>
      </div>
    </div>
  );
};
