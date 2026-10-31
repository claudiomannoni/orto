"""Ripara gli accenti persi («?» al posto di à è ì ò ù ’ –) nei file dati scritti da Codex. Uso: python scripts/ripara-accenti.py <cartella> file1 file2 ..."""
import re
import sys

REGOLE = [
    (r'educator\?s', 'educator’s'),
    (r'(\d)\?(\d)', r'\1–\2'),
    (r'(?<=[a-z])it\?', 'ità'),   # età, varietà, maturità, variabilità, capacità
    (r'\bet\?', 'età'),
    (r'\bd\?(?=[ ,.])', 'dà'),
    (r'\bpi\?\b', 'più'),
    (r'\bperch\?', 'perché'),
    (r'\bcos\?\b', 'così'),
    (r'\bgi\?\b', 'già'),
    (r'\bpu\?\b', 'può'),
    (r'\bci\?\b', 'ciò'),
    (r' \? (?=[a-z])', ' è '),
    (r'\b(dell|nell|all|sull|un|quell|l)\?(?=[a-zàèéìòù])', r'\1’'),
]

cartella = sys.argv[1]
for nome in sys.argv[2:]:
    p = f'{cartella}/{nome}'
    c = open(p, encoding='utf-8', newline='').read()
    for modello, sost in REGOLE:
        c = re.sub(modello, sost, c)
    open(p, 'w', encoding='utf-8', newline='').write(c)
print('fatto')
