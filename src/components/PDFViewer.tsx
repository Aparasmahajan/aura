import React, { useRef, useEffect, useState } from 'react';
import { FileText, Download, ZoomIn, ZoomOut, RotateCw, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import './PDFViewer.scss';

interface PDFViewerProps {
  src: string;
  title: string;
  description?: string;
  pageCount?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  src,
  title,
  description,
  pageCount
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setError('');
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load PDF');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [src]);

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: Event) => e.preventDefault();
    
    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.key === 'F5' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Toggle rotation by changing transform
    const currentTransform = iframe.style.transform;
    if (currentTransform.includes('rotate(90deg)')) {
      iframe.style.transform = 'rotate(0deg)';
    } else {
      iframe.style.transform = 'rotate(90deg)';
    }
  };

  const handleFullscreen = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pageCount && currentPage < pageCount) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const pdfUrl = `${src}#page=${currentPage}&zoom=${zoom}`;

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-header">
        <h3 className="pdf-title">{title}</h3>
        {description && <p className="pdf-description">{description}</p>}
        {pageCount && <span className="pdf-page-count">{pageCount} pages</span>}
      </div>
      
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <button className="toolbar-btn" onClick={handleZoomOut}>
            <ZoomOut size={18} />
          </button>
          
          <span className="zoom-level">{zoom}%</span>
          
          <button className="toolbar-btn" onClick={handleZoomIn}>
            <ZoomIn size={18} />
          </button>
          
          <button className="toolbar-btn" onClick={handleRotate}>
            <RotateCw size={18} />
          </button>
        </div>

        <div className="pdf-toolbar-center">
          <button 
            className="toolbar-btn" 
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="page-info">
            Page {currentPage} {pageCount && `of ${pageCount}`}
          </span>
          
          <button 
            className="toolbar-btn" 
            onClick={handleNextPage}
            disabled={pageCount ? currentPage >= pageCount : false}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="pdf-toolbar-right">
          <button className="toolbar-btn" onClick={handleFullscreen}>
            <Maximize size={18} />
          </button>
        </div>
      </div>

      <div className="pdf-viewer">
        {isLoading && (
          <div className="pdf-loading">
            <div className="loading-spinner"></div>
            <p>Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <FileText size={48} />
            <p>{error}</p>
            <button 
              className="btn-retry" 
              onClick={() => {
                setIsLoading(true);
                setError('');
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!error && (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="pdf-iframe"
            title={title}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (zoom / 100)}%`,
              height: `${100 / (zoom / 100)}%`
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
