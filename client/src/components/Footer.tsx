import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { NavItem } from './NavItem';

export const navigationItems = [
  { name: 'Home', href: '/' },
  { name: 'Explore', href: '/explore' },
  { name: 'Reviews', href: '/reviews' },
  { name: 'About', href: '/about' },
];

const ignore = ['/', '/about', '/privacy'];

export const Footer = () => {
  const location = useLocation();

  let scrollPosition = window.pageYOffset;

  const [show, setShow] = useState(ignore.includes(location.pathname));

  useEffect(() => {
    if (ignore.includes(location.pathname)) return;

    const handleScroll = () => {
      const currentPosition = window.pageYOffset;
      setShow(currentPosition >= scrollPosition);
      scrollPosition = currentPosition;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollPosition]);

  return (
    <nav
      className='sticky bottom-0 flex w-full flex-row items-center justify-between overflow-hidden bg-neutral-100 transition-all duration-100 dark:bg-neutral-800'
      style={{ height: show ? 64 : 0 }}
    >
      <div className='ml-10 flex flex-row'>
        {navigationItems.map((item, i) => (
          <div key={i} className='mx-3'>
            <NavItem name={item.name} href={item.href} key={item.name} />
          </div>
        ))}
      </div>
      <div className='mr-10 space-x-6'>
        <NavItem name={'Privacy Policy'} href={'/privacy'} />
        <NavItem name={'Terms and Conditions'} href={'/tos'} />
      </div>
    </nav>
  );
};
