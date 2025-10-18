# Content Components

This directory contains specialized components for rendering different types of content in the ApexAura application.

## Components

### VideoPlayer
Renders video content with security features to prevent recording and downloading.

**Features:**
- Custom video controls (play/pause, volume, fullscreen, progress)
- Disabled right-click context menu
- Disabled keyboard shortcuts (F12, F5, Ctrl+Shift+I)
- Disabled drag and drop
- Responsive design
- Auto-hiding controls

**Props:**
- `src`: Video file URL
- `title`: Video title
- `description`: Optional video description
- `thumbnailUrl`: Optional thumbnail image URL
- `duration`: Optional video duration
- `resolution`: Optional video resolution

### AudioPlayer
Renders audio content with security features and visual waveform.

**Features:**
- Custom audio controls (play/pause, volume, skip forward/backward)
- Animated waveform visualization
- Disabled right-click context menu
- Disabled keyboard shortcuts
- Disabled drag and drop
- Responsive design

**Props:**
- `src`: Audio file URL
- `title`: Audio title
- `description`: Optional audio description
- `duration`: Optional audio duration
- `mimeType`: Optional MIME type

### PDFViewer
Renders PDF documents with zoom and navigation controls.

**Features:**
- Zoom in/out functionality
- Page navigation
- Rotation support
- Fullscreen mode
- Disabled right-click context menu
- Disabled keyboard shortcuts
- Responsive design

**Props:**
- `src`: PDF file URL
- `title`: PDF title
- `description`: Optional PDF description
- `pageCount`: Optional number of pages

### BlogContent
Renders text-based content (blogs, articles, etc.).

**Features:**
- Clean typography
- Metadata display (creation date, update date)
- Responsive design
- Empty state handling

**Props:**
- `title`: Content title
- `description`: Optional content description
- `textContent`: The actual text content
- `createdAt`: Creation timestamp
- `updatedAt`: Optional update timestamp

### ContentRenderer
Main component that automatically renders the appropriate content component based on content type.

**Features:**
- Automatic content type detection
- Fallback for unsupported content types
- Consistent interface

**Props:**
- `content`: ContentItem object with all content data

## Usage

```tsx
import { ContentRenderer } from '../components';

// In your component
<ContentRenderer content={contentItem} />
```

## Security Features

All media components (VideoPlayer, AudioPlayer) include security measures to prevent:
- Right-click context menu access
- Keyboard shortcuts for developer tools
- Drag and drop functionality
- Direct file downloads (for video/audio)

## Styling

All components use SCSS and follow the project's design system:
- Consistent color palette
- Responsive breakpoints
- Modern UI patterns
- Accessibility considerations
