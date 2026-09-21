"""Check every executable inline and external JS file; skip compressed data blocks."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import tempfile

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active = False
        self.blocks = []
    def handle_starttag(self, tag, attrs):
        if tag != 'script':
            return
        attrs = dict(attrs)
        self.active = 'src' not in attrs and attrs.get('type', '').lower() in ('', 'text/javascript', 'application/javascript', 'module')
        if self.active:
            self.blocks.append('')
    def handle_data(self, data):
        if self.active:
            self.blocks[-1] += data
    def handle_endtag(self, tag):
        if tag == 'script':
            self.active = False

parser = Scripts()
parser.feed(Path('index.html').read_text(encoding='utf-8-sig'))
with tempfile.TemporaryDirectory() as tmp:
    for i, text in enumerate(parser.blocks):
        script = Path(tmp) / f'inline-{i}.js'
        script.write_text(text, encoding='utf-8')
        subprocess.run(['node', '--check', str(script)], check=True)
for script in sorted(Path('.').glob('*.js')):
    subprocess.run(['node', '--check', str(script)], check=True)
print(f'final syntax checks: PASS ({len(parser.blocks)} inline blocks + external JS)')
