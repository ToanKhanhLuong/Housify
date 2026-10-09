import React from 'react';
import styles from './ZaloButton.module.css';

const ZaloButton = ({
  phone,
  label = "Nhắn Zalo Quản lý",
  size = "md",
  fullWidth = false,
  className = ""
}) => {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const zaloUrl = cleanPhone ? `https://zalo.me/${cleanPhone}` : '#';

  const classes = [
    styles.zaloBtn,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <a
      href={zaloUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
      title={`Chat Zalo với quản lý: ${phone || ''}`}
    >
      <span className={styles.zaloIcon}>
        <svg viewBox="0 0 48 48" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <path fill="#ffffff" d="M24 4C12.95 4 4 12.51 4 23.01c0 5.61 2.55 10.64 6.64 14.15l-1.6 6.04a1.5 1.5 0 0 0 1.94 1.81l6.98-2.88c1.92.57 3.96.88 6.04.88 11.05 0 20-8.51 20-19.01S35.05 4 24 4z"/>
          <path fill="#0068FF" d="M34.8 28.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.6-1-0.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7.1-.1.3-.4.4-.6.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/>
        </svg>
      </span>
      <span>{label}</span>
    </a>
  );
};

export default ZaloButton;
