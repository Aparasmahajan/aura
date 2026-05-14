import React from 'react';
import ContentCard from './ContentCard';

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

interface ContentRendererProps {
  content: ContentItem;
  onClick?: () => void;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ content, onClick }) => {
  return (
    <ContentCard content={content} onClick={onClick} />
  );
};

export default ContentRenderer;
