import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

import { useDarkMode } from '../hooks/useDarkMode';

export const DarkModeToggle = () => {
  const [darkMode, setDarkMode] = useDarkMode();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <button
      onClick={toggleDarkMode}
      className='rounded-2xl p-1 hover:bg-gray-50 dark:hover:bg-neutral-700'
    >
      {darkMode ? (
        <SunIcon className='size-6 fill-gray-400 stroke-gray-400 stroke-2' />
      ) : (
        <MoonIcon className='size-6 stroke-neutral-500 stroke-2' />
      )}
    </button>
  );
};
