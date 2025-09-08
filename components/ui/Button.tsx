import React from 'react';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  return (
    <button {...props}>
      {props.children}
    </button>
  );
};

export default Button;
