import { ClassNameValue } from './ClassNameValue';

// Recursive so a caller's array can be nested inside another component's array without a cast.
export type ClassNameInput = ClassNameValue | ClassNameInput[];
