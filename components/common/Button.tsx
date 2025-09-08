import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";
  
  const variantClasses = {
    primary: 'bg-brand-primary text-background hover:bg-opacity-90 focus:ring-brand-primary',
    secondary: 'bg-overlay text-text-primary hover:bg-border-color focus:ring-brand-secondary',
    ghost: 'bg-transparent text-text-secondary hover:bg-overlay hover:text-text-primary',
    danger: 'bg-danger text-background hover:bg-opacity-90 focus:ring-danger',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const hasContent = React.Children.count(children) > 0;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {leftIcon && <span className={`${hasContent ? 'mr-2' : ''} ${iconSizeClasses[size]}`}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={`${hasContent ? 'ml-2' : ''} ${iconSizeClasses[size]}`}>{rightIcon}</span>}
    </button>
  );
};