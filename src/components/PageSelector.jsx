import { useState, useEffect, useRef } from 'react';
import { X, FileText, Eye, EyeOff } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

function PageSelector({ totalPages, onConfirm, onCancel, fileName, pdfFile }) {
  const MAX_PAGES_ALLOWED = 10; // Reduced from 20 to save API costs
  const RECOMMENDED_PAGES = 5;  // Sweet spot for quality + speed
  
  const [selectionMode, setSelectionMode] = useState('range'); // Default to range, not 'all'
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.min(RECOMMENDED_PAGES, totalPages));
  const [customPages, setCustomPages] = useState('');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewPages, setPreviewPages] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [fullscreenPage, setFullscreenPage] = useState(null);
  const [fullscreenLoading, setFullscreenLoading] = useState(false);
  const canvasRefs = useRef({});

  // Handle range input changes properly
  const handleRangeStartChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setRangeStart('');
    } else {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setRangeStart(num);
      }
    }
  };

  const handleRangeEndChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setRangeEnd('');
    } else {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setRangeEnd(num);
      }
    }
  };

  // Generate preview thumbnails
  const generatePreviews = async () => {
    if (!pdfFile || !showPreview) return;
    
    setLoadingPreview(true);
    try {
      // Determine which pages to preview
      let pagesToPreview = [];
      if (selectionMode === 'all') {
        pagesToPreview = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1);
      } else if (selectionMode === 'range') {
        const start = rangeStart === '' ? 1 : parseInt(rangeStart);
        const end = rangeEnd === '' ? totalPages : parseInt(rangeEnd);
        if (start > 0 && end <= totalPages && start <= end) {
          pagesToPreview = Array.from(
            { length: Math.min(end - start + 1, 10) },
            (_, i) => start + i
          );
        }
      } else if (selectionMode === 'custom' && customPages.trim()) {
        try {
          const parsed = parseCustomPages(customPages);
          pagesToPreview = parsed.slice(0, 10);
        } catch (e) {
          // Invalid input, skip preview
        }
      }

      if (pagesToPreview.length === 0) {
        setPreviewPages([]);
        setLoadingPreview(false);
        return;
      }

      // Load PDF
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      // Render thumbnails
      const previews = [];
      for (const pageNum of pagesToPreview) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.3 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        previews.push({
          pageNum,
          dataUrl: canvas.toDataURL()
        });
      }

      setPreviewPages(previews);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Regenerate previews when selection changes
  useEffect(() => {
    if (showPreview) {
      const timeoutId = setTimeout(() => {
        generatePreviews();
      }, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [showPreview, selectionMode, rangeStart, rangeEnd, customPages]);

  // Open fullscreen view of a page
  const openFullscreen = async (pageNum) => {
    if (!pdfFile) return;
    
    setFullscreenPage({ pageNum, dataUrl: null });
    setFullscreenLoading(true);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(pageNum);
      
      // Higher scale for fullscreen
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      setFullscreenPage({
        pageNum,
        dataUrl: canvas.toDataURL()
      });
    } catch (error) {
      console.error('Fullscreen render failed:', error);
      setFullscreenPage(null);
    } finally {
      setFullscreenLoading(false);
    }
  };

  const closeFullscreen = () => {
    setFullscreenPage(null);
  };

  const parseCustomPages = (input) => {
    const pages = new Set();
    const parts = input.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Handle ranges like "1-5"
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          throw new Error(`Invalid range: ${trimmed}`);
        }
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      } else {
        // Handle single page numbers
        const pageNum = parseInt(trimmed);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          throw new Error(`Invalid page number: ${trimmed}`);
        }
        pages.add(pageNum);
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleConfirm = () => {
    setError('');
    
    try {
      let selectedPages;
      
      if (selectionMode === 'all') {
        selectedPages = Array.from({ length: totalPages }, (_, i) => i + 1);
      } else if (selectionMode === 'range') {
        // Validate and convert to numbers
        const start = rangeStart === '' ? 1 : parseInt(rangeStart);
        const end = rangeEnd === '' ? totalPages : parseInt(rangeEnd);
        
        if (start < 1 || end > totalPages || start > end) {
          setError('Invalid page range');
          return;
        }
        selectedPages = Array.from(
          { length: end - start + 1 },
          (_, i) => start + i
        );
      } else if (selectionMode === 'custom') {
        if (!customPages.trim()) {
          setError('Please enter page numbers');
          return;
        }
        selectedPages = parseCustomPages(customPages);
        
        if (selectedPages.length === 0) {
          setError('No valid pages selected');
          return;
        }
      }
      
      // Enforce max pages limit
      if (selectedPages.length > MAX_PAGES_ALLOWED) {
        setError(`You can only process up to ${MAX_PAGES_ALLOWED} pages at once. You selected ${selectedPages.length} pages.`);
        return;
      }
      
      // Warn if exceeding recommended amount
      if (selectedPages.length > RECOMMENDED_PAGES) {
        const proceed = confirm(
          `⚠️ You selected ${selectedPages.length} pages\n\n` +
          `Recommended: ${RECOMMENDED_PAGES} pages for faster processing\n\n` +
          `Continue anyway?`
        );
        if (!proceed) return;
      }
      
      onConfirm(selectedPages);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Select Pages</h2>
              <p className="text-sm text-gray-400 mt-1">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total pages info */}
        <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-purple-200">
            Total pages: <span className="font-bold">{totalPages}</span>
        </p>
        <p className="text-xs text-yellow-300">
            Max {MAX_PAGES_ALLOWED} pages
        </p>
        </div>
        {/* <p className="text-xs text-gray-400">
        💡 Tip: 5-10 pages works best for focused study sessions
        </p> */}

        {/* Selection mode buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={() => setSelectionMode('range')}
            className={`w-full p-3 rounded-lg text-left transition ${
              selectionMode === 'range'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="font-medium">Page range (Recommended)</div>
            <div className="text-sm opacity-80">Select a continuous range of pages</div>
          </button>

          <button
            onClick={() => setSelectionMode('custom')}
            className={`w-full p-3 rounded-lg text-left transition ${
              selectionMode === 'custom'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="font-medium">Specific pages</div>
            <div className="text-sm opacity-80">Choose individual pages or ranges</div>
          </button>
          
          {totalPages <= MAX_PAGES_ALLOWED && (
            <button
              onClick={() => setSelectionMode('all')}
              className={`w-full p-3 rounded-lg text-left transition ${
                selectionMode === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="font-medium">All pages</div>
              <div className="text-sm opacity-80">Process entire document ({totalPages} pages)</div>
            </button>
          )}
        </div>

        {/* Range inputs */}
        {selectionMode === 'range' && (
          <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">From</label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={rangeStart}
                  onChange={handleRangeStartChange}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="text-gray-400 mt-6">to</div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">To</label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={rangeEnd}
                  onChange={handleRangeEndChange}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Custom page input */}
        {selectionMode === 'custom' && (
          <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
            <label className="block text-sm text-gray-300 mb-2">
              Enter page numbers
            </label>
            <input
              type="text"
              value={customPages}
              onChange={(e) => setCustomPages(e.target.value)}
              placeholder="e.g., 1,3,5-8,12"
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-2">
              Examples: "1,2,3" or "1-5" or "1,3-7,10"
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Preview toggle button */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full mb-4 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2 text-gray-300"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showPreview ? 'Hide' : 'Show'} Page Preview</span>
        </button>

        {/* Preview section */}
        {showPreview && (
          <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                <span className="ml-3 text-gray-400">Loading preview...</span>
              </div>
            ) : previewPages.length > 0 ? (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  Previewing {previewPages.length} page{previewPages.length > 1 ? 's' : ''}
                  {previewPages.length === 10 && selectionMode !== 'all' && ' (showing first 10)'}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {previewPages.map(({ pageNum, dataUrl }) => (
                    <div 
                      key={pageNum} 
                      className="relative group cursor-pointer"
                      onClick={() => openFullscreen(pageNum)}
                    >
                      <img
                        src={dataUrl}
                        alt={`Page ${pageNum}`}
                        className="w-full h-auto rounded border border-gray-600 group-hover:border-purple-500 transition"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Page {pageNum}
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Enter a valid page selection to see preview
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
          >
            Process Pages
          </button>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenPage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={closeFullscreen}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-bold">
                  Page {fullscreenPage.pageNum}
                </h3>
              </div>
              <button
                onClick={closeFullscreen}
                className="text-gray-400 hover:text-white transition p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Image container */}
            <div 
              className="flex-1 flex items-center justify-center overflow-auto bg-gray-900 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {fullscreenLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                  <span className="text-gray-400">Loading full resolution...</span>
                </div>
              ) : fullscreenPage.dataUrl ? (
                <img
                  src={fullscreenPage.dataUrl}
                  alt={`Page ${fullscreenPage.pageNum}`}
                  className="max-w-full max-h-full object-contain"
                />
              ) : null}
            </div>

            {/* Hint */}
            <p className="text-center text-gray-500 text-sm mt-4">
              Click outside to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PageSelector;