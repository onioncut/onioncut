import { ComponentPropsWithRef, FC } from 'react';
import { ClassNameInput } from '../types/ClassNameInput';

export type DivProps = Omit<ComponentPropsWithRef<'div'>, 'className'> & {
  className?: ClassNameInput;
};

// The return type is spelled out only because the function calls itself, and TypeScript cannot infer a
// recursive one.
const flattenClassName = (input: ClassNameInput): string[] => {
  if (Array.isArray(input)) {
    return input.flatMap(flattenClassName);
  }

  return input ? [input] : [];
};

// className as an array, so a conditional class is `condition && 'class'` instead of a template string.
export const Div: FC<DivProps> = ({ className, ...args }) => {
  return <div {...args} className={flattenClassName(className).join(' ')} />;
};
