import React from 'react';
import {
  FaFingerprint,
  FaBolt,
  FaFileContract,
  FaTools,
  FaClock,
  FaReceipt
} from 'react-icons/fa';
import { mockFeatures } from '../../../../data/mockFeatures';
import styles from './WhyChooseUs.module.css';

const iconMap = {
  FaFingerprint: <FaFingerprint />,
  FaBolt: <FaBolt />,
  FaFileContract: <FaFileContract />,
  FaTools: <FaTools />,
  FaClock: <FaClock />,
  FaReceipt: <FaReceipt />
};

const WhyChooseUs = () => {
  return (
    <section id="features" className={styles.section}>
      <div className="container-custom">
        <div className="section-title-wrap">
          <span className="section-tag">Tiêu chuẩn sống mới</span>
          <h2 className="section-title">Vì Sao Nên Thuê Phòng Tại Housify?</h2>
          <p className="section-subtitle">
            Housify ứng dụng công nghệ vào vận hành giúp cuộc sống người thuê phòng trở nên tiện lợi, an toàn và minh bạch nhất.
          </p>
        </div>

        <div className={styles.grid}>
          {mockFeatures.map((feat) => (
            <div key={feat.id} className={styles.featureCard}>
              <div className={styles.iconWrap}>
                {iconMap[feat.icon] || <FaFingerprint />}
              </div>
              <h3 className={styles.title}>{feat.title}</h3>
              <p className={styles.desc}>{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
