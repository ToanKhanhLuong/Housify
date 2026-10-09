import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import Button from '../../../../components/ui/Button/Button';
import { rentalSteps } from '../../../../data/mockFeatures';
import styles from './RentalProcess.module.css';

const RentalProcess = () => {
  return (
    <section id="process" className={styles.section}>
      <div className="container-custom">
        <div className="section-title-wrap">
          <span
            className="section-tag"
            style={{ backgroundColor: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8' }}
          >
            Đơn giản & Nhanh chóng
          </span>
          <h2 className={`section-title ${styles.titleLight}`}>
            Quy Trình Thuê Phòng Tại Housify
          </h2>
          <p className={`section-subtitle ${styles.subtitleLight}`}>
            Chỉ với 4 bước đơn giản, trực tiếp làm việc cùng Quản lý tòa nhà không qua trung gian.
          </p>
        </div>

        <div className={styles.grid}>
          {rentalSteps.map((item) => (
            <div key={item.step} className={styles.stepCard}>
              <div className={styles.stepNumber}>{item.step}</div>
              <h3 className={styles.stepTitle}>{item.title}</h3>
              <p className={styles.stepDesc}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaWrap}>
          <Link to="/rooms">
            <Button variant="primary" size="lg" icon={<FaArrowRight size={14} />}>
              Bắt đầu chọn phòng ngay
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RentalProcess;
