import type { ComponentType } from 'react';
import { BtnXsBg } from './btn-xs-bg';
import { BtnSmBg } from './btn-sm-bg';
import { BtnMdBg } from './btn-md-bg';
import { BtnLgBg } from './btn-lg-bg';
import { BtnXlBg } from './btn-xl-bg';
import { BtnXxlBg } from './btn-xxl-bg';
import { BtnBoxBg } from './btn-box-bg';

export interface ColorScheme {
  light: string;
  medium: string;
  dark: string;
  main: string;
}

export type ButtonColorScheme = 'gray' | 'blue' | 'lightGray' | 'green' | 'red';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'box';

export type BtnBgProps = { className?: string; color?: ButtonColorScheme };

export const bgBySize: Record<ButtonSize, ComponentType<BtnBgProps>> = {
  xs: BtnXsBg,
  sm: BtnSmBg,
  md: BtnMdBg,
  lg: BtnLgBg,
  xl: BtnXlBg,
  xxl: BtnXxlBg,
  box: BtnBoxBg,
};

export const colorSchemes: Record<ButtonColorScheme, ColorScheme> = {
  gray: {
    light: '#D5D8DD',
    medium: '#ACB0BC',
    dark: '#747C8F',
    main: '#ACB0BC',
  },
  blue: {
    light: '#A2B5E3',
    medium: '#557FE8',
    dark: '#1F3467',
    main: '#557FE8',
  },
  lightGray: {
    light: '#D5D8DD',
    medium: '#D5D8DD',
    dark: '#747C8F',
    main: '#D5D8DD',
  },
  green: {
    light: '#00af00',
    medium: '#008800',
    dark: '#005101',
    main: '#008800',
  },
  red: {
    light: '#FF0000',
    medium: '#FF0000',
    dark: '#FF0000',
    main: '#FF0000',
  },
};
