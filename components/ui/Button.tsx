import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          // Variant styles
          {
            // Primary - Gradient violet/blue with glow (matches theme)
            'bg-gradient-to-r from-violet-600 to-blue-700 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:from-violet-700 hover:to-blue-800 focus-visible:ring-violet-500':
              variant === 'primary',
            // Secondary - Slate background with dark text (matches theme)
            'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 hover:border-slate-400 focus-visible:ring-slate-400':
              variant === 'secondary',
            // Danger - Red gradient
            'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30 hover:from-red-700 hover:to-red-600 focus-visible:ring-red-500':
              variant === 'danger',
            // Ghost - Transparent with hover
            'text-slate-600 hover:bg-slate-100 hover:text-violet-700 focus-visible:ring-violet-500':
              variant === 'ghost',
            // Outline - Bordered
            'border-2 border-violet-600 text-violet-700 bg-transparent hover:bg-violet-600 hover:text-white focus-visible:ring-violet-500':
              variant === 'outline',
          },
          // Size styles
          {
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
