from pathlib import Path

text=Path("index.html").read_text(encoding="utf-8-sig")
start=text.index("function renderPastResult(){")
end=text.index("\nfunction escapeHtml(",start)
chunk=text[start:end]
print("=== MOCK_RESULT_SOURCE_BEGIN ===")
print(chunk)
print("=== MOCK_RESULT_SOURCE_END ===")
