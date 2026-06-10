import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/brand';
import { cn } from '@/lib/utils';

/** Logo lockup aspect ratio (width / height) */
const LOGO_ASPECT = 1.35;

interface FdsLogoProps {
  className?: string;
  /** Lockup height in pixels */
  size?: number;
  priority?: boolean;
  /** Pass false to render without a link wrapper */
  linked?: boolean;
  href?: string;
}

export function FdsLogo({
  className,
  size = 40,
  priority = false,
  linked = true,
  href = '/',
}: FdsLogoProps) {
  const height = size;
  const width = Math.round(height * LOGO_ASPECT);

  const img = (
    <Image
      src={SITE.logo}
      alt={SITE.name}
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto w-auto shrink-0 object-contain', className)}
      style={{ width, height }}
    />
  );

  if (linked) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {img}
      </Link>
    );
  }

  return img;
}
