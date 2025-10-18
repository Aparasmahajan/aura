import React from 'react';
import { Play, Volume2, FileText, Book, Clock, Image } from 'lucide-react';
import './ContentCard.scss';

interface MediaMetadata {
  mediaMetadataId: number;
  mimeType: string;
  duration?: string;
  pageCount?: number;
  resolution?: string;
  thumbnailUrl?: string;
}

interface ContentItem {
  contentId: number;
  type: string;
  title: string;
  description?: string;
  fileUrl?: string;
  textContent?: string;
  sizeInBytes?: number;
  mediaMetadata?: MediaMetadata;
  createdAt: string;
  updatedAt: string;
}

interface ContentCardProps {
  content: ContentItem;
  onClick?: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, onClick }) => {
  const getTypeIcon = () => {
    switch (content.type.toUpperCase()) {
      case 'VIDEO':
        return <Play size={24} />;
      case 'AUDIO':
        return <Volume2 size={24} />;
      case 'PDF':
        return <FileText size={24} />;
      case 'BLOG':
      case 'TEXT':
        return <Book size={24} />;
      default:
        return <FileText size={24} />;
    }
  };

  const getTypeLabel = () => {
    switch (content.type.toUpperCase()) {
      case 'VIDEO':
        return 'Video';
      case 'AUDIO':
        return 'Audio';
      case 'PDF':
        return 'PDF';
      case 'BLOG':
      case 'TEXT':
        return 'Blog';
      default:
        return 'File';
    }
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return '';
    // Handle both "00:05:00" and "5:00" formats
    const parts = duration.split(':');
    if (parts.length === 3 && parts[0] === '00') {
      return parts.slice(1).join(':');
    }
    return duration;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getThumbnailUrl = () => {
    if (content.mediaMetadata?.thumbnailUrl) {
      return content.mediaMetadata.thumbnailUrl;
    }
    return null;
  };

  return (
    <div className="content-card" onClick={onClick}>
      <div className="content-card-thumbnail">
        {getThumbnailUrl() ? (
          <img 
            src={getThumbnailUrl()!} 
            alt={content.title}
            className="thumbnail-image"
          />
        ) : (
          <div className="thumbnail-placeholder">
            {getTypeIcon()}
          </div>
        )}
        
        <div className="content-card-overlay">
          <div className="content-type-badge">
            {getTypeLabel()}
          </div>
          
          {(content.type.toUpperCase() === 'VIDEO' || content.type.toUpperCase() === 'AUDIO') && content.mediaMetadata?.duration && (
            <div className="duration-badge">
              <Clock size={14} />
              <span>{formatDuration(content.mediaMetadata.duration)}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="content-card-info">
        <h3 className="content-title">{content.title}</h3>
        
        {content.description && (
          <p className="content-description">{content.description}</p>
        )}
        
        <div className="content-meta">
          {content.mediaMetadata?.resolution && (
            <span className="meta-item">{content.mediaMetadata.resolution}</span>
          )}
          
          {content.sizeInBytes && (
            <span className="meta-item">{formatFileSize(content.sizeInBytes)}</span>
          )}
          
          {content.mediaMetadata?.pageCount && (
            <span className="meta-item">{content.mediaMetadata.pageCount} pages</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentCard;
