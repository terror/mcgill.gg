import { useState } from 'react';
import { Navbar } from './Navbar';
import { useDarkMode } from '../hooks/useDarkMode';
import { classNames } from '../lib/utils';

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  const { darkMode, setDarkMode } = useDarkMode();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className='dark:bg-neutral-900'>
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
};
