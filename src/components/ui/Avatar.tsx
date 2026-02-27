type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  return (
    <div
      className={[
        'relative flex-shrink-0 rounded-full overflow-hidden',
        'flex items-center justify-center',
        'bg-navy-700 text-slate-300 font-medium',
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={name ? `Avatar for ${name}` : 'User avatar'}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
