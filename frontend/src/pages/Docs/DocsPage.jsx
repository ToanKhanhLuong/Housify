import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { docsData } from './docsData';
import styles from './DocsPage.module.css';

const DocsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Mặc định nếu không có slug thì lấy 'gioi-thieu'
  const currentSlug = slug || 'gioi-thieu';
  const doc = docsData[currentSlug];

  useEffect(() => {
    if (doc) {
      document.title = `${doc.title} - Housify`;
    }
  }, [doc]);

  if (!doc) {
    return (
      <div className={styles.pageWrapper}>
        <div className="container-custom">
          <div className={styles.docCard}>
            <h1 className={styles.title}>Không tìm thấy tài liệu</h1>
            <p className={styles.paragraph}>
              Trang thông tin bạn đang tìm kiếm không tồn tại hoặc đã được cập nhật.
            </p>
            <Link to="/" className={styles.breadcrumbLink}>
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className="container-custom">
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/" className={styles.breadcrumbLink}>
            Trang chủ
          </Link>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>{doc.breadcrumb}</span>
        </nav>

        {/* Main Doc Card Box */}
        <div className={styles.docCard}>
          <h1 className={styles.title}>{doc.title}</h1>

          {doc.sections &&
            doc.sections.map((sec, idx) => (
              <div key={idx} className={styles.section}>
                {sec.heading && (
                  <h2 className={styles.sectionHeading}>{sec.heading}</h2>
                )}

                {sec.paragraphs &&
                  sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className={styles.paragraph}>
                      {p}
                    </p>
                  ))}

                {sec.bullets && (
                  <ul className={styles.bulletList}>
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx} className={styles.bulletItem}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                {sec.conclusion && (
                  <p className={styles.paragraph}>{sec.conclusion}</p>
                )}
              </div>
            ))}

          {/* Quick Help Box */}
          <div className={styles.contactBox}>
            <div className={styles.contactBoxTitle}>
              Cần hỗ trợ thêm thông tin hoặc giải đáp thắc mắc?
            </div>
            <p className={styles.contactBoxText}>
              Vui lòng liên hệ trực tiếp Ban Quản Lý qua Hotline:{' '}
              <strong>0886.344.566</strong> hoặc Email:{' '}
              <strong>contact@housify.vn</strong> để được hỗ trợ nhanh chóng nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
