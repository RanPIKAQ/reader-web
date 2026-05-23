function ReaderContent({
  isTxt,
  contentRef,
  chapterLines,
  currentChapterIndex,
  readerStyle,
  paragraphSpacing = 0,
  paragraphIndent = 0,
}) {
  if (isTxt) {
    return (
      <div
        ref={contentRef}
        className="txt-content"
        style={readerStyle}
      >
        {chapterLines.map((line, index) => {
          const isParagraphBreak =
            index > 0 &&
            chapterLines[index - 1].text.trim() === '' &&
            line.text.trim() !== '';
          const isFirstLineOfParagraph = index === 0 || isParagraphBreak;

          return (
            <div
              key={`${currentChapterIndex}-${line.lineIndex}-${line.startOffset}`}
              className="txt-line"
              data-line-index={line.lineIndex}
              data-line-start={line.startOffset}
              style={{
                marginBottom: isParagraphBreak && paragraphSpacing > 0
                  ? `${paragraphSpacing}em`
                  : 0,
                textIndent: isFirstLineOfParagraph && paragraphIndent > 0
                  ? `${paragraphIndent}em`
                  : 0,
              }}
            >
              {line.text || ' '}
            </div>
          );
        })}
      </div>
    );
  }

  return <div ref={contentRef} className="epub-container" />;
}

export default ReaderContent;
