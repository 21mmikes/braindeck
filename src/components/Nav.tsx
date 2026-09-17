'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Upload' },
  { href: '/library', label: 'Library' },
  { href: '/stats', label: 'Progress' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <span className="brand-mark">🧠</span>
        BrainDeck
      </Link>
      {LINKS.map((link) => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${active ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
