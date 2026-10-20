import React from 'react';
import styles from './Badge.module.css';

export default function Badge({
  children,
  variant = 'primary', // 'available' | 'coming_soon' | 'occupied' | 'primary' | 'tag'
  className = ''
}) {
  const classes = [
    styles.badge,
    styles[variant] || styles.primary,
    className
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
