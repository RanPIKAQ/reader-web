function ReaderContent({
  isTxt,
  contentRef,
  chapterLines,
  currentChapterIndex,
  readerStyle,
}) {
  if (isTxt) {
    return (
      <div
        ref={contentRef}
        className="txt-content"
        style={readerStyle}
      >
        {chapterLines.map((line) => (
          <div
            key={`${currentChapterIndex}-${line.lineIndex}-${line.startOffset}`}
            className="txt-line"
            data-line-index={line.lineIndex}
            data-line-start={line.startOffset}
          >
            {line.text || ' '}
          </div>
        ))}
      </div>
    );
  }

  return <div ref={contentRef} className="epub-container" />;
}

export default ReaderContent;
