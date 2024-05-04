import { Menu, Transition } from '@headlessui/react';
import React, { Fragment, useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { GoDotFill } from 'react-icons/go';
import { VscBell } from 'react-icons/vsc';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import type { Notification } from '../lib/model';
import { repo } from '../lib/repo';
import { courseIdToUrlParam, spliceCourseCode } from '../lib/utils';
import { CourseReview } from './CourseReview';

export const NotificationDropdown = ({
  notifications,
  setNotifications,
}: {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
}) => {
  const [refs, setRefs] = useState<React.RefObject<HTMLDivElement>[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRefs(notifications.map(() => React.createRef<HTMLDivElement>()));
  }, [notifications]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    notifications.forEach((notification, index) => {
      const ref = refs[index];

      if (ref && ref.current) {
        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
          entries.forEach((entry: IntersectionObserverEntry) => {
            if (entry.isIntersecting) updateNotification(notification);
          });
        };

        const observer = new IntersectionObserver(handleIntersection);
        observer.observe(ref.current as Element);

        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [notifications, refs, isMenuOpen]);

  useEffect(() => {
    if (seen.size === 0) return;

    setNotifications(
      notifications.map((n) => {
        return seen.has(n.review.courseId) ? { ...n, seen: true } : n;
      })
    );

    setSeen(new Set());
  }, [isMenuOpen]);

  const updateNotification = async (notification: Notification) => {
    if (notification.seen) return;

    try {
      await repo.updateNotification(
        notification.review.courseId,
        notification.review.userId,
        true
      );
      seen.add(notification.review.courseId);
    } catch (err) {
      toast.error('Failed to update notification.');
    }
  };

  const deleteNotification = async (courseId: string) => {
    try {
      await repo.deleteNotification(courseId);
      setNotifications(
        notifications.filter(
          (notification) => notification.review.courseId !== courseId
        )
      );
      toast.success('Successfully deleted notification.');
    } catch (err) {
      toast.error('Failed to delete notification.');
    }
  };

  return (
    <div className='z-30 text-right'>
      <Menu as='div' className='relative inline-block text-left'>
        {({ open }) => {
          useEffect(() => {
            setIsMenuOpen(open);
          }, [open]);

          return (
            <>
              <div>
                <Menu.Button className='m-2 inline-flex justify-center text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white'>
                  <div className='relative'>
                    <VscBell
                      className='-mr-1 ml-2 size-5 stroke-[0.5] text-neutral-500 dark:text-gray-400'
                      aria-hidden='true'
                    />
                    {notifications.filter((notification) => !notification.seen)
                      .length !== 0 && (
                      <div className='absolute right-[-3px] top-px size-2 rounded-full bg-red-600' />
                    )}
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
              >
                <Menu.Items className='autocomplete absolute -right-8 z-30 mt-2 max-h-[800px] max-w-[325px] origin-top-right divide-y divide-gray-100 overflow-auto rounded-md bg-slate-100 shadow-lg dark:bg-neutral-800 md:max-w-[800px]'>
                  <div className='p-2'>
                    {notifications.length !== 0 ? (
                      notifications.map((notification, i) => (
                        <Menu.Item key={i}>
                          {() => (
                            <div
                              className='m-2'
                              ref={refs[i]}
                              onClick={(e) => e.preventDefault()}
                            >
                              <div className='mb-2 flex items-center'>
                                <div className='flex items-center gap-x-1'>
                                  <p className='font-semibold text-gray-800 dark:text-gray-200'>
                                    <Link
                                      to={`/course/${courseIdToUrlParam(
                                        notification.review.courseId
                                      )}`}
                                    >
                                      {spliceCourseCode(
                                        notification.review.courseId,
                                        ' '
                                      )}
                                    </Link>
                                  </p>
                                  {!notification.seen && (
                                    <GoDotFill className='text-red-400' />
                                  )}
                                </div>
                                <FaTrash
                                  onClick={async () =>
                                    await deleteNotification(
                                      notification.review.courseId
                                    )
                                  }
                                  className='ml-auto text-right text-gray-700 underline hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50'
                                />
                              </div>
                              <CourseReview
                                className='rounded-md'
                                review={notification.review}
                                canModify={false}
                                handleDelete={() => undefined}
                                openEditReview={() => undefined}
                              />
                            </div>
                          )}
                        </Menu.Item>
                      ))
                    ) : (
                      <p className='w-[325px] p-1 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300'>
                        All caught up! Subscribe to courses to get notified when
                        a user leaves a review.
                      </p>
                    )}
                  </div>
                </Menu.Items>
              </Transition>
            </>
          );
        }}
      </Menu>
    </div>
  );
};
