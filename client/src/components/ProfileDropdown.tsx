import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { User } from 'react-feather';
import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

import { getUrl } from '../lib/utils';

export const ProfileDropdown = () => {
  return (
    <Menu as='div' className='relative inline-block text-left'>
      <div>
        <Menu.Button className='rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700'>
          <User className='size-5 dark:text-gray-400' aria-hidden='true' />
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
        <Menu.Items className='absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-neutral-800 dark:text-gray-200'>
          <div className='py-1'>
            <Menu.Item>
              {({ active }) => (
                <Link
                  to='/profile'
                  className={twMerge(
                    active
                      ? 'bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-gray-200'
                      : 'text-gray-700 dark:bg-neutral-800 dark:text-gray-200',
                    'block px-4 py-2 text-sm'
                  )}
                >
                  Profile
                </Link>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <a
                  href={`${getUrl()}/api/auth/logout?redirect=${
                    window.location.origin
                  }`}
                  className={twMerge(
                    active
                      ? 'bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-gray-200'
                      : 'text-gray-700 dark:bg-neutral-800 dark:text-gray-200',
                    'block w-full px-4 py-2 text-left text-sm'
                  )}
                >
                  Log out
                </a>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
