import React from 'react';
import { FileText, Calendar, Clock } from 'lucide-react';
import './BlogContent.scss';

interface BlogContentProps {
  title: string;
  description?: string;
  textContent?: string;
  createdAt: string;
  updatedAt?: string;
}

const BlogContent: React.FC<BlogContentProps> = ({
  title,
  description,
  textContent,
  createdAt,
  updatedAt
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="blog-content-container">
      <div className="blog-header">
        <div className="blog-icon">
          <FileText size={24} />
        </div>
        
        <div className="blog-info">
          <h3 className="blog-title">{title}</h3>
          
          {description && (
            <p className="blog-description">{description}</p>
          )}
          
          <div className="blog-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>{formatDate(createdAt)}</span>
            </div>
            
            <div className="meta-item">
              <Clock size={16} />
              <span>{formatTime(createdAt)}</span>
            </div>
            
            {updatedAt && updatedAt !== createdAt && (
              <div className="meta-item updated">
                <span>Updated: {formatDate(updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {textContent && (
        <div className="blog-content">
          <div className="content-body">
            {textContent.split('\n').map((paragraph, index) => (
              paragraph.trim() ? (
                <p key={index} className="content-paragraph">
                  {paragraph}
                </p>
              ) : (
                <br key={index} />
              )
            ))}
          </div>
        </div>
      )}

      {!textContent && (
        <div className="blog-empty">
          <FileText size={48} />
          <p>No content available</p>
        </div>
      )}
    </div>
  );
};

export default BlogContent;
