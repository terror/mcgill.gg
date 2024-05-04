import { Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import birdImageUrl from '../assets/bird.png';
import { useAuth } from '../hooks/useAuth';
import type { Notification, SearchResults } from '../lib/model';
import { repo } from '../lib/repo';
import { getSearchIndex, updateSearchResults } from '../lib/searchIndex';
import { getUrl } from '../lib/utils';
import { CourseSearchBar } from './CourseSearchBar';
import { DarkModeToggle } from './DarkModeToggle';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileDropdown } from './ProfileDropdown';
import { SideNav } from './SideNav';

const { courses, instructors, coursesIndex, instructorsIndex } =
  getSearchIndex();

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [arrowColor, setArrowColor] = useState(
    'text-gray-900 dark:text-gray-200'
  );

  const [results, setResults] = useState<SearchResults & { query: string }>({
    query: '',
    courses: [],
    instructors: [],
  });

  const user = useAuth();
  const location = useLocation();
  const pathName = location.pathname;

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    repo
      .getNotifications()
      .then((data) => setNotifications(data))
      .catch(() => toast.error('Failed to get notifications.'));
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

  const reset = () => {
    setResults({
      query: '',
      courses: [],
      instructors: [],
    });
  };

  return (
    <header className='z-40'>
      <nav
        className='z-40 flex items-center justify-between p-3 lg:px-8'
        aria-label='Global'
      >
        <div className='z-40 my-auto mr-auto flex min-w-[48px] lg:flex-1'>
          <Link to='/' className='-m-1.5 p-1.5'>
            <img className='h-12 w-auto' src={birdImageUrl} alt='bird' />
          </Link>
        </div>
        {pathName !== '/' ? (
          <div className='mx-8 my-auto hidden flex-1 justify-center align-middle sm:mx-12 sm:block md:mx-28'>
            <CourseSearchBar
              results={results}
              handleInputChange={handleInputChange}
              onResultClick={reset}
            />
          </div>
        ) : null}
        {user && (
          <div className='mr-2 lg:hidden'>
            <NotificationDropdown
              notifications={notifications}
              setNotifications={setNotifications}
            />
          </div>
        )}
        <div className='flex lg:hidden'>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-200'
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className='sr-only'>Open main menu</span>
            <Bars3Icon
              className='size-6 stroke-2 text-gray-400'
              aria-hidden='true'
            />
          </button>
        </div>
        <div className='flex min-w-fit flex-row lg:flex-1'>
          <div className='my-auto hidden gap-x-1 lg:ml-auto lg:flex lg:items-center'>
            <DarkModeToggle />
            {user && (
              <NotificationDropdown
                notifications={notifications}
                setNotifications={setNotifications}
              />
            )}
          </div>
          <div className='hidden lg:ml-4 lg:flex lg:justify-end'>
            {user ? (
              <ProfileDropdown />
            ) : (
              <a
                href={`${getUrl()}/api/auth/login?redirect=${
                  window.location.href
                }`}
                className='my-auto text-sm font-semibold leading-6 text-gray-900 dark:text-gray-200'
                onMouseEnter={() => setArrowColor('text-red-600')}
                onMouseLeave={() =>
                  setArrowColor('text-gray-900 dark:text-gray-200')
                }
              >
                Log in{' '}
                <span className={arrowColor} aria-hidden='true'>
                  &rarr;
                </span>{' '}
              </a>
            )}
          </div>
        </div>
      </nav>
      <SideNav open={mobileMenuOpen} onClose={setMobileMenuOpen} />
    </header>
  );
};
