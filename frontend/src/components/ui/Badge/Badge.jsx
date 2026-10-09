import React from 'react';
import styles from './Badge.module.css';

const Badge = ({
  children,
  variant = 'primary', // 'available' | 'coming_soon' | 'occupied' | 'primary' | 'tag'
  className = ''
}) => {
  const classes = [
    styles.badge,
    styles[variant] || styles.primary,
    className
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
};

export default Badge;
