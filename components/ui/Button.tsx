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
            // Primary - Gradient navy with glow
            'bg-gradient-to-r from-navy to-blue-700 text-white shadow-md shadow-navy/25 hover:shadow-lg hover:shadow-navy/30 hover:from-blue-800 hover:to-blue-600 focus-visible:ring-navy':
              variant === 'primary',
            // Secondary - Subtle gray
            'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 focus-visible:ring-gray-400':
              variant === 'secondary',
            // Danger - Red gradient
            'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30 hover:from-red-700 hover:to-red-600 focus-visible:ring-red-500':
              variant === 'danger',
            // Ghost - Transparent with hover
            'text-gray-600 hover:bg-gray-100 hover:text-navy focus-visible:ring-navy':
              variant === 'ghost',
            // Outline - Bordered
            'border-2 border-navy text-navy bg-transparent hover:bg-navy hover:text-white focus-visible:ring-navy':
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
