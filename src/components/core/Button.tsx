import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/client';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-body font-semibold transition-all focus-visible:outline-none disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-sb-teal text-[#051A14] hover:brightness-110 active:scale-[0.97]',
        gold: 'bg-sb-gold text-[#1A0A00] hover:brightness-110 active:scale-[0.97]',
        outline:
          'bg-transparent text-sb-teal border border-sb-teal hover:bg-sb-teal/10 active:scale-[0.97]',
        ghost:
          'bg-transparent text-sb-text-body border border-sb-border hover:bg-sb-turf active:scale-[0.97] font-medium',
        danger:
          'bg-transparent text-sb-loss border border-sb-loss hover:bg-sb-loss/10 active:scale-[0.97]',
        link: 'text-sb-teal underline-offset-4 hover:underline font-medium',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs rounded-md',
        default: 'h-10 px-5 text-sm rounded-lg',
        lg: 'h-12 px-7 text-base rounded-[10px]',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
