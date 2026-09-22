"""Apply the v5.13 release after legacy generators; safe to rerun."""
from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8-sig')
text = re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '5.13';", text, count=1)
text = re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>', '<title>Maritime Drill v5.13 · Android</title>', text, count=1)
text = re.sub(r'<script src="(keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>', lambda m: f'<script src="{m[1]}.js?v=5.13"></script>', text)
text = text.replace('Google Drive 진도 동기화 <span style="font-size:10px;font-weight:800;color:#7C3AED">v5.08</span>', 'Google Drive 진도 동기화 <span style="font-size:10px;font-weight:800;color:#7C3AED">v5.13</span>')
text = text.replace('최신 수정본 우선이며, 연결 중에는 약 20초 간격·화면 복귀 시 자동 확인합니다.', '기기별 변경 내용을 병합하며, 연결 중에는 약 20초 간격·화면 복귀 시 자동 확인합니다. 유효한 연결은 브라우저를 다시 열어도 유지됩니다. Google 권한이 만료되면 연결 갱신 버튼을 눌러주세요.')
text = text.replace('onclick="disconnectGoogleDriveSync()">연결 해제</button>', 'onclick="disconnectGoogleDriveSync()">이 브라우저 연결 해제</button>')
p.write_text(text, encoding='utf-8')
print('drive authentication v5.13 patch applied')
