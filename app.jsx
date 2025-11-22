const { useState, useEffect, useRef } = React;

const ImageManager = () => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [folderPath, setFolderPath] = useState("");
  const [showConfirm, setShowConfirm] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const handleFolderSelect = async () => {
    const folder = await window.electron.selectFolder();
    if (!folder) return;

    setFolderPath(folder);
    const imageList = await window.electron.getImages(folder);
    setImages(imageList);

    // Load saved selections
    const savedSelections = await window.electron.loadSelections(folder);
    setSelections(savedSelections);
    setCurrentIndex(0);
  };

  // Keyboard shortcuts:
  // - ArrowLeft / ArrowRight to navigate images
  // - 'c' to toggle Add to Copy
  // - 'd' to toggle Add to Delete
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore when typing in inputs or when confirm dialog is open
      const target = e.target;
      if (
        (target &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) ||
        (target && target.isContentEditable) ||
        showConfirm
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        // Toggle copy selection for current image
        handleSelection("copy");
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        // Toggle delete selection for current image
        handleSelection("delete");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images, showConfirm, autoAdvance]);

  // type: 'copy' | 'delete'
  // imgPath: optional image path to toggle (if not provided, uses currentImage)
  const handleSelection = async (type, imgPath = null) => {
    const newSelections = { ...selections };
    const targetImg = imgPath || images[currentIndex];
    const prevSel = selections[targetImg];

    // Toggle off if clicking the same selection
    if (newSelections[targetImg] === type) {
      delete newSelections[targetImg];
    } else {
      newSelections[targetImg] = type;
    }

    setSelections(newSelections);
    await window.electron.saveSelections(folderPath, newSelections);

    // Auto-advance only when selecting (not unselecting) and when enabled
    const justSelected = prevSel !== type && newSelections[targetImg] === type;
    if (
      !imgPath &&
      autoAdvance &&
      justSelected &&
      currentIndex < images.length - 1
    ) {
      setTimeout(() => {
        setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
      }, 200);
    }
  };

  const getFilteredImages = (type) => {
    return Object.entries(selections)
      .filter(([_, selType]) => selType === type)
      .map(([img, _]) => img);
  };

  const executeAction = async () => {
    setIsProcessing(true);
    const action = showConfirm;
    const imagesToProcess = getFilteredImages(action);

    let result;
    if (action === "copy") {
      result = await window.electron.copyFiles(imagesToProcess);
    } else {
      result = await window.electron.deleteFiles(imagesToProcess);
    }

    if (result.success) {
      // Remove processed images from selections
      const newSelections = { ...selections };
      imagesToProcess.forEach((img) => delete newSelections[img]);
      setSelections(newSelections);
      await window.electron.saveSelections(folderPath, newSelections);

      alert(
        `Successfully ${action === "copy" ? "copied" : "deleted"} ${
          imagesToProcess.length
        } images`
      );
    }

    setIsProcessing(false);
    setShowConfirm(null);
  };

  const currentImage = images[currentIndex];
  const currentSelection = selections[currentImage];
  const copyCount = getFilteredImages("copy").length;
  const deleteCount = getFilteredImages("delete").length;

  if (images.length === 0) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Image Manager</h1>
          <p className="text-gray-600 mb-6">
            Select a folder to start organizing your images
          </p>
          <button
            onClick={handleFolderSelect}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Select Folder
          </button>
        </div>
      </div>
    );
  }

  const ConfirmDialog = () => {
    const imagesToProcess = getFilteredImages(showConfirm);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">
              Confirm {showConfirm === "copy" ? "Copy" : "Delete"}
            </h2>
            <p className="text-gray-600 mt-2">
              {imagesToProcess.length} image(s) selected
            </p>
          </div>

          {/* Virtualized grid to avoid rendering thousands of images at once */}
          <VirtualizedGrid
            images={imagesToProcess}
            actionType={showConfirm}
            selections={selections}
            onToggle={handleSelection}
          />

          <div className="p-6 border-t flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirm(null)}
              disabled={isProcessing}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={executeAction}
              disabled={isProcessing}
              className={`px-6 py-2 rounded-lg text-white ${
                showConfirm === "copy"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50`}
            >
              {isProcessing
                ? "Processing..."
                : `Confirm ${showConfirm === "copy" ? "Copy" : "Delete"}`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {showConfirm && <ConfirmDialog />}

      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Image Manager</h1>
          <p className="text-sm text-gray-400">{folderPath}</p>
        </div>
        <div className="flex gap-4">
          <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">
            Copy: {copyCount}
          </span>
          <span className="px-3 py-1 bg-red-600 rounded-full text-sm">
            Delete: {deleteCount}
          </span>
          <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </span>

          <button
            onClick={() => setAutoAdvance((v) => !v)}
            className={`px-3 py-1 rounded-full text-sm border ${
              autoAdvance
                ? "bg-green-600 text-white border-green-600"
                : "bg-gray-700 text-white border-gray-600"
            }`}
            title="Toggle auto-advance"
          >
            Auto-advance: {autoAdvance ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        <img
          src={`file://${currentImage}`}
          alt="Current"
          className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${
            currentSelection === "copy"
              ? "ring-8 ring-blue-500"
              : currentSelection === "delete"
              ? "ring-8 ring-red-500"
              : ""
          }`}
          style={{ maxWidth: "90vw", maxHeight: "80vh" }}
        />

        <button
          onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 disabled:opacity-30"
        >
          ←
        </button>

        <button
          onClick={() =>
            currentIndex < images.length - 1 &&
            setCurrentIndex(currentIndex + 1)
          }
          disabled={currentIndex === images.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="bg-gray-800 p-6 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleSelection("copy")}
              className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                currentSelection === "copy"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              📋 Add to Copy
            </button>

            <button
              onClick={() => handleSelection("delete")}
              className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                currentSelection === "delete"
                  ? "bg-red-600 text-white"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              🗑️ Add to Delete
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirm("copy")}
              disabled={copyCount === 0}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              ✓ Proceed to Copy ({copyCount})
            </button>

            <button
              onClick={() => setShowConfirm("delete")}
              disabled={deleteCount === 0}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              ✓ Proceed to Delete ({deleteCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<ImageManager />, document.getElementById("root"));

// Virtualized grid component for ConfirmDialog
function VirtualizedGrid({ images, actionType, selections, onToggle }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const cols = 3;
  const itemHeight = 156; // estimated row height in px (image + label + gap)

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    onScroll();
    setContainerHeight(el.clientHeight);
    el.addEventListener("scroll", onScroll);
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  const rows = Math.ceil(images.length / cols);
  const visibleRows = Math.ceil(containerHeight / itemHeight) || 6;
  const buffer = 3;
  const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endRow = Math.min(rows, startRow + visibleRows + buffer * 2);

  const startIndex = startRow * cols;
  const endIndex = Math.min(images.length, endRow * cols);

  const topSpacer = startRow * itemHeight;
  const bottomSpacer = Math.max(0, (rows - endRow) * itemHeight);

  const visible = images.slice(startIndex, endIndex);

  return (
    <div className="p-6 overflow-y-auto max-h-96" ref={containerRef}>
      <div style={{ height: topSpacer }} />
      <div className="grid grid-cols-3 gap-4">
        {visible.map((img, i) => {
          const idx = startIndex + i;
          return (
            <div key={idx} className="relative">
              <img
                src={`file://${img}`}
                alt={`Preview ${idx}`}
                className="w-full h-32 object-cover rounded"
                loading="lazy"
              />
              <div className="text-xs truncate mt-1">
                {img.split(/[/\\]/).pop()}
              </div>

              {/* selection checkbox badge */}
              <button
                onClick={() => onToggle(actionType, img)}
                className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shadow-lg border-2 focus:outline-none ${
                  selections[img] === "copy"
                    ? "bg-blue-600 border-white"
                    : selections[img] === "delete"
                    ? "bg-red-600 border-white"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
                title={
                  selections[img]
                    ? `Selected (${selections[img]}) - click to unselect`
                    : "Not selected"
                }
              >
                {selections[img] === "copy"
                  ? "📋"
                  : selections[img] === "delete"
                  ? "🗑️"
                  : "✓"}
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ height: bottomSpacer }} />
    </div>
  );
}
